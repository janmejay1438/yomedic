import { About, Blog, Gallery, Home, Newsletter, Person, Social, Work } from "@/types";
import { Line, Row, Text } from "@once-ui-system/core";

const person: Person = {
  firstName: "Yomedic",
  lastName: "System",
  name: `Yomedic Platform`,
  role: "Healthcare Management Platform",
  avatar: "/images/avatar.jpg",
  email: "contact@yomedic.com",
  location: "Asia/Kolkata", 
  languages: ["English", "Hindi", "Multilingual"],
  locale: "en",
};

const newsletter: Newsletter = {
  display: false,
  title: <>Subscribe to Yomedic Updates</>,
  description: <>District health management insights</>,
};

const social: Social = [
  {
    name: "Email",
    icon: "email",
    link: `mailto:${person.email}`,
    essential: true,
  },
];

const home: Home = {
  path: "/",
  image: "/images/og/home.jpg",
  label: "Home",
  title: `Yomedic - Real-time Health Centre Management`,
  description: `Multilingual AI platform for real-time health centre management. Track stocks, footfall, beds, and more.`,
  headline: <>Transforming PHC & CHC Management with AI</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <strong className="ml-4">Yomedic</strong>{" "}
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Access Platform
        </Text>
      </Row>
    ),
    href: "/login",
  },
  subline: (
    <>
      Resolve medicine stock-outs, manage patient footfalls, and track bed unavailability in real-time. 
      <br/>Get early warnings and AI-driven forecasts across your district.
    </>
  ),
};

const about: About = {
  path: "/about",
  label: "About Yomedic",
  title: `About – Yomedic`,
  description: `Yomedic Platform`,
  tableOfContent: {
    display: false,
    subItems: false,
  },
  avatar: {
    display: false,
  },
  calendar: {
    display: false,
    link: "",
  },
  intro: {
    display: false,
    title: "Introduction",
    description: (
      <>
        Yomedic is a platform designed for health centers.
      </>
    ),
  },
  work: {
    display: false,
    title: "Capabilities",
    experiences: [],
  },
  studies: {
    display: false, 
    title: "Research",
    institutions: [],
  },
  technical: {
    display: false,
    title: "Tech Stack",
    skills: [],
  },
};

const blog: Blog = {
  path: "/blog",
  label: "Blog",
  title: "Yomedic Updates",
  description: `Latest from Yomedic`,
};

const work: Work = {
  path: "/work",
  label: "Modules",
  title: `Yomedic Modules`,
  description: `Yomedic platform modules`,
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Dashboard",
  title: `Platform Dashboard`,
  description: `Yomedic Interface`,
  images: [],
};

export { person, social, newsletter, home, about, blog, work, gallery };
