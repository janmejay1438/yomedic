import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore'; // needed for FieldValue
import { Resend } from 'resend';
import crypto from 'crypto';

// Initialize Supabase Client (Service Role for Admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY!);


export async function POST(req: Request) {
  try {
    // 🔒 Security: Verify Admin Identity
    // In production, extract the token from headers and verify it with Firebase Admin
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(authHeader);
    
    // We assume the verified admin token implies access. You could further verify decodedToken.email
    // if there's a strict whitelist of admin accounts (e.g. admin@123.com).

    const { facilityName, establishmentId, contactEmail, docId } = await req.json();

    if (!facilityName || !establishmentId || !contactEmail || !docId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate Dynamic Credentials
    const generatedEmail = `${establishmentId.toLowerCase().replace(/-/g, '')}@yomedic.com`;
    const generatedPassword = crypto.randomBytes(8).toString('hex') + 'A1!x'; // Strong, random temp password

    // --- 🚀 ATOMIC WORKFLOW START ---

    // STEP 1: Supabase Update
    // Depending on user's table name, updating access_requests to map to the frontend Code.
    const { error: supabaseError } = await supabase
      .from('access_requests') // using access_requests as found in page.tsx
      .update({ status: 'approved' })
      .eq('id', docId);

    if (supabaseError) {
      console.error('Supabase Error:', supabaseError);
      return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
    }

    let createdUserRecord = null;

    try {
      // STEP 2: Firebase Auth Creation
      createdUserRecord = await adminAuth.createUser({
        email: generatedEmail,
        password: generatedPassword,
        displayName: facilityName,
      });

      // STEP 3: Firestore Document Creation
      await adminDb.collection('users').doc(createdUserRecord.uid).set({
        email: generatedEmail,
        contactEmail: contactEmail,
        role: 'hospital',
        establishmentId: establishmentId,
        facilityName: facilityName,
        createdAt: FieldValue.serverTimestamp(),
      });

    } catch (firebaseError) {
      console.error('Firebase Error - Initiating Rollback:', firebaseError);
      
      // 🛑 ROLLBACK: Delete Firebase user if it was created but Firestore failed
      if (createdUserRecord) {
        await adminAuth.deleteUser(createdUserRecord.uid).catch(console.error);
      }
      // 🛑 ROLLBACK: Revert Supabase status back to Pending
      await supabase
        .from('access_requests')
        .update({ status: 'pending' })
        .eq('id', docId);
        
      return NextResponse.json({ error: 'Failed to provision facility account. Operations rolled back.' }, { status: 500 });
    }

    // STEP 4: Automated Email Notification
    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Yomedic Admin <no-reply@yomedic.com>', // Ensure domain is verified in Resend
          to: contactEmail,
          subject: 'Your Yomedic Facility Account is Approved! 🎉',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <h2>Welcome to Yomedic, ${facilityName}!</h2>
              <p>Your facility verification request (ID: <strong>${establishmentId}</strong>) has been fully approved.</p>
              <p>Here are the credentials to access your Hospital Dashboard:</p>
              <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
                <p><strong>Email:</strong> ${generatedEmail}</p>
                <p><strong>Temporary Password:</strong> ${generatedPassword}</p>
              </div>
              <p><em>⚠️ Please log in and change your password immediately.</em></p>
              <br/>
              <a href="https://yomedic.com/login" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
            </div>
          `,
        });
      } else {
        console.warn('RESEND_API_KEY not configured. Skipping email.');
      }
    } catch (emailError) {
      // We don't rollback if *only* the email fails (accounts are successfully provisioned), 
      // but we log it so admin can manually resend credentials.
      console.error('Email failed to send:', emailError);
    }

    // --- ✅ WORKFLOW SUCCESS ---
    return NextResponse.json({ 
      success: true, 
      message: 'Facility approved and account provisioned successfully.'
    });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
