/**
 * Seed script — populates the database with realistic non-profit organizations.
 * Run: npx tsx src/seed.ts
 *
 * Each org gets a dedicated seed user as its owner.
 * Safe to re-run: skips if seed users already exist.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { sequelize } from './config/database';
import { User, Organization } from './models';
import bcrypt from 'bcryptjs';

const SEED_PASSWORD = 'Catalyze2026!';

interface SeedOrg {
  name: string;
  category: string;
  mission: string;
  description: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  website: string;
  contactEmail: string;
  contactPhone: string;
  registrationNo: string;
}

const SEED_ORGS: SeedOrg[] = [
  // ── Education (4) ──
  {
    name: 'Teach For America',
    category: 'Education',
    mission: 'Finding, developing, and supporting a diverse network of leaders who expand opportunity for children from classrooms, schools, and every sector and field that shapes the broader systems in which schools operate.',
    description: 'Teach For America recruits and develops a diverse corps of outstanding leaders who make an initial two-year commitment to teach in high-need schools and become lifelong advocates for educational equity.',
    city: 'New York',
    state: 'NY',
    latitude: 40.7128,
    longitude: -74.0060,
    website: 'https://www.teachforamerica.org',
    contactEmail: 'contact@teachforamerica.org',
    contactPhone: '(800) 832-1230',
    registrationNo: '13-3541913',
  },
  {
    name: 'Khan Academy',
    category: 'Education',
    mission: 'Providing a free, world-class education for anyone, anywhere.',
    description: 'Khan Academy offers practice exercises, instructional videos, and a personalized learning dashboard that empower learners to study at their own pace in and outside of the classroom.',
    city: 'Mountain View',
    state: 'CA',
    latitude: 37.3861,
    longitude: -122.0839,
    website: 'https://www.khanacademy.org',
    contactEmail: 'info@khanacademy.org',
    contactPhone: '(650) 429-3774',
    registrationNo: '26-1544963',
  },
  {
    name: 'DonorsChoose',
    category: 'Education',
    mission: 'Empowering public school teachers to get the materials and experiences their students need to thrive.',
    description: 'DonorsChoose connects teachers in high-need communities with donors who want to help. Teachers submit project requests, and donors can give to the projects that inspire them.',
    city: 'New York',
    state: 'NY',
    latitude: 40.7484,
    longitude: -73.9967,
    website: 'https://www.donorschoose.org',
    contactEmail: 'help@donorschoose.org',
    contactPhone: '(212) 239-3615',
    registrationNo: '13-4129457',
  },
  {
    name: 'Room to Read',
    category: 'Education',
    mission: 'Seeking a world of change through the power of education. Working in collaboration with communities and partner organizations, we develop literacy skills and a habit of reading among primary school children, and support girls to complete secondary school with the skills to negotiate key life decisions.',
    description: 'Room to Read has benefited over 23 million children across 21 countries with a focus on literacy and gender equality in education.',
    city: 'San Francisco',
    state: 'CA',
    latitude: 37.7749,
    longitude: -122.4194,
    website: 'https://www.roomtoread.org',
    contactEmail: 'info@roomtoread.org',
    contactPhone: '(415) 839-4400',
    registrationNo: '91-2003533',
  },

  // ── Health (4) ──
  {
    name: 'Doctors Without Borders',
    category: 'Health',
    mission: 'Providing independent, impartial medical humanitarian assistance to the people who need it most.',
    description: 'Médecins Sans Frontières (MSF) provides emergency medical care in conflict zones, epidemics, and natural disasters across more than 70 countries worldwide.',
    city: 'New York',
    state: 'NY',
    latitude: 40.7614,
    longitude: -73.9776,
    website: 'https://www.doctorswithoutborders.org',
    contactEmail: 'info@newyork.msf.org',
    contactPhone: '(212) 679-6800',
    registrationNo: '13-3433452',
  },
  {
    name: 'St. Jude Children\'s Research Hospital',
    category: 'Health',
    mission: 'Advancing cures and means of prevention for pediatric catastrophic diseases through research and treatment. No child is denied treatment based on the family\'s ability to pay.',
    description: 'St. Jude is leading the way the world understands, treats, and defeats childhood cancer and other life-threatening diseases. Families never receive a bill from St. Jude.',
    city: 'Memphis',
    state: 'TN',
    latitude: 35.1556,
    longitude: -90.0428,
    website: 'https://www.stjude.org',
    contactEmail: 'info@stjude.org',
    contactPhone: '(800) 822-6344',
    registrationNo: '62-0646012',
  },
  {
    name: 'Partners In Health',
    category: 'Health',
    mission: 'Providing a preferential option for the poor in health care by working alongside the public sector to deliver high-quality care and address the root causes of disease and poverty.',
    description: 'Partners In Health brings the benefits of modern medicine to those who need it most, building health systems that serve entire communities in 11 countries across four continents.',
    city: 'Boston',
    state: 'MA',
    latitude: 42.3601,
    longitude: -71.0589,
    website: 'https://www.pih.org',
    contactEmail: 'info@pih.org',
    contactPhone: '(857) 880-5100',
    registrationNo: '04-3567502',
  },
  {
    name: 'Direct Relief',
    category: 'Health',
    mission: 'Improving the health and lives of people affected by poverty and emergencies — without regard to politics, religion, or ability to pay.',
    description: 'Direct Relief is a humanitarian aid organization active in all 50 U.S. states and more than 80 countries. It provides medical resources to community health centers, free clinics, and public health agencies.',
    city: 'Santa Barbara',
    state: 'CA',
    latitude: 34.4208,
    longitude: -119.6982,
    website: 'https://www.directrelief.org',
    contactEmail: 'info@directrelief.org',
    contactPhone: '(805) 964-4767',
    registrationNo: '95-1831116',
  },

  // ── Environment (4) ──
  {
    name: 'The Nature Conservancy',
    category: 'Environment',
    mission: 'Conserving the lands and waters on which all life depends.',
    description: 'The Nature Conservancy works in all 50 states and 79 countries and territories to tackle climate change, protect land and water, and build healthy cities through science-based solutions.',
    city: 'Arlington',
    state: 'VA',
    latitude: 38.8816,
    longitude: -77.0910,
    website: 'https://www.nature.org',
    contactEmail: 'member@tnc.org',
    contactPhone: '(800) 628-6860',
    registrationNo: '53-0242652',
  },
  {
    name: 'Sierra Club',
    category: 'Environment',
    mission: 'Exploring, enjoying, and protecting the wild places of the Earth; practicing and promoting the responsible use of the Earth\'s resources.',
    description: 'The Sierra Club is the most enduring and influential grassroots environmental organization in the United States, with over 3.8 million members and supporters.',
    city: 'Oakland',
    state: 'CA',
    latitude: 37.8044,
    longitude: -122.2712,
    website: 'https://www.sierraclub.org',
    contactEmail: 'information@sierraclub.org',
    contactPhone: '(415) 977-5500',
    registrationNo: '94-0991526',
  },
  {
    name: 'Ocean Conservancy',
    category: 'Environment',
    mission: 'Working to protect the ocean from today\'s greatest global challenges through science-based advocacy, research, and public education.',
    description: 'Ocean Conservancy has been a leader in ocean conservation for over 50 years, running the International Coastal Cleanup — the world\'s largest volunteer event for the ocean.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9072,
    longitude: -77.0369,
    website: 'https://oceanconservancy.org',
    contactEmail: 'info@oceanconservancy.org',
    contactPhone: '(800) 519-1541',
    registrationNo: '52-0907599',
  },
  {
    name: 'Rainforest Alliance',
    category: 'Environment',
    mission: 'Creating a more sustainable world by using social and market forces to protect nature and improve the lives of farmers and forest communities.',
    description: 'The Rainforest Alliance works at the intersection of business, agriculture, and forests to make responsible business the new normal through certification and sustainable land-use practices.',
    city: 'New York',
    state: 'NY',
    latitude: 40.7223,
    longitude: -73.9985,
    website: 'https://www.rainforest-alliance.org',
    contactEmail: 'info@ra.org',
    contactPhone: '(212) 677-1900',
    registrationNo: '13-3377893',
  },

  // ── Community (3) ──
  {
    name: 'United Way',
    category: 'Community',
    mission: 'Improving lives by mobilizing the caring power of communities around the world to advance the common good.',
    description: 'United Way fights for the health, education, and financial stability of every person in every community. They engage millions of people to give, advocate, and volunteer.',
    city: 'Alexandria',
    state: 'VA',
    latitude: 38.8048,
    longitude: -77.0469,
    website: 'https://www.unitedway.org',
    contactEmail: 'info@unitedway.org',
    contactPhone: '(703) 836-7112',
    registrationNo: '13-1635294',
  },
  {
    name: 'Habitat for Humanity',
    category: 'Community',
    mission: 'Seeking to put God\'s love into action, bringing people together to build homes, communities, and hope.',
    description: 'Habitat for Humanity has helped more than 46 million people build or improve the place they call home since 1976, working in communities across all 50 states and approximately 70 countries.',
    city: 'Atlanta',
    state: 'GA',
    latitude: 33.7490,
    longitude: -84.3880,
    website: 'https://www.habitat.org',
    contactEmail: 'publicinfo@habitat.org',
    contactPhone: '(800) 422-4828',
    registrationNo: '91-1914868',
  },
  {
    name: 'Rotary International',
    category: 'Community',
    mission: 'Providing service to others, promoting integrity, and advancing world understanding, goodwill, and peace through a fellowship of business, professional, and community leaders.',
    description: 'Rotary connects 1.4 million members in over 46,000 clubs to promote peace, fight disease, provide clean water, support education, save mothers and children, grow local economies, and protect the environment.',
    city: 'Evanston',
    state: 'IL',
    latitude: 42.0451,
    longitude: -87.6877,
    website: 'https://www.rotary.org',
    contactEmail: 'contact.center@rotary.org',
    contactPhone: '(866) 976-8279',
    registrationNo: '36-3245072',
  },

  // ── Arts & Culture (3) ──
  {
    name: 'Americans for the Arts',
    category: 'Arts & Culture',
    mission: 'Building recognition and support for the extraordinary and dynamic value of the arts and to lead, serve, and advance the diverse networks of organizations and individuals who cultivate the arts in America.',
    description: 'Americans for the Arts is the nation\'s leading nonprofit dedicated to advancing the arts and arts education, with a network spanning every Congressional district.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9072,
    longitude: -77.0369,
    website: 'https://www.americansforthearts.org',
    contactEmail: 'info@artsusa.org',
    contactPhone: '(202) 371-2830',
    registrationNo: '23-7168685',
  },
  {
    name: 'National Trust for Historic Preservation',
    category: 'Arts & Culture',
    mission: 'Saving the places that matter through storytelling, education, advocacy, and preservation.',
    description: 'The National Trust for Historic Preservation works to save America\'s historic places, including buildings, landscapes, neighborhoods, and communities with cultural significance.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9076,
    longitude: -77.0387,
    website: 'https://savingplaces.org',
    contactEmail: 'info@savingplaces.org',
    contactPhone: '(202) 588-6000',
    registrationNo: '53-0210807',
  },
  {
    name: 'StoryCorps',
    category: 'Arts & Culture',
    mission: 'Preserving and sharing humanity\'s stories in order to build connections between people and create a more just and compassionate world.',
    description: 'StoryCorps has recorded over 600,000 Americans sharing their stories, creating one of the largest oral history archives. Excerpts air on NPR\'s Morning Edition.',
    city: 'Brooklyn',
    state: 'NY',
    latitude: 40.6782,
    longitude: -73.9442,
    website: 'https://storycorps.org',
    contactEmail: 'info@storycorps.org',
    contactPhone: '(646) 723-7020',
    registrationNo: '20-1007797',
  },

  // ── Youth (3) ──
  {
    name: 'Big Brothers Big Sisters of America',
    category: 'Youth',
    mission: 'Creating and supporting mentoring relationships that ignite the power and promise of youth.',
    description: 'Big Brothers Big Sisters has been pairing volunteer mentors ("Bigs") with young people ("Littles") since 1904, making it the oldest and largest youth mentoring organization in the U.S.',
    city: 'Tampa',
    state: 'FL',
    latitude: 27.9506,
    longitude: -82.4572,
    website: 'https://www.bbbs.org',
    contactEmail: 'info@bbbs.org',
    contactPhone: '(813) 720-8778',
    registrationNo: '22-1657804',
  },
  {
    name: 'Boys & Girls Clubs of America',
    category: 'Youth',
    mission: 'Enabling all young people, especially those who need us most, to reach their full potential as productive, caring, responsible citizens.',
    description: 'Boys & Girls Clubs of America serves nearly 4 million kids and teens through 4,700+ Club locations. Programs focus on academic success, healthy lifestyles, and character development.',
    city: 'Atlanta',
    state: 'GA',
    latitude: 33.7629,
    longitude: -84.3923,
    website: 'https://www.bgca.org',
    contactEmail: 'info@bgca.org',
    contactPhone: '(404) 487-5700',
    registrationNo: '13-5562976',
  },
  {
    name: 'Girls Who Code',
    category: 'Youth',
    mission: 'Closing the gender gap in technology and changing the image of what a programmer looks like.',
    description: 'Girls Who Code has reached over 500,000 girls through clubs, summer programs, and college-career programs, working to build the largest pipeline of future female engineers.',
    city: 'New York',
    state: 'NY',
    latitude: 40.7406,
    longitude: -73.9939,
    website: 'https://girlswhocode.com',
    contactEmail: 'info@girlswhocode.com',
    contactPhone: '(212) 838-0040',
    registrationNo: '46-1339871',
  },

  // ── Housing (3) ──
  {
    name: 'National Low Income Housing Coalition',
    category: 'Housing',
    mission: 'Achieving socially just public policy that ensures people with the lowest incomes in the United States have affordable and decent homes.',
    description: 'NLIHC advocates for federal housing policy solutions through research, education, organizing, and advocacy. It publishes the annual "Out of Reach" report on housing affordability.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9012,
    longitude: -77.0312,
    website: 'https://nlihc.org',
    contactEmail: 'info@nlihc.org',
    contactPhone: '(202) 662-1530',
    registrationNo: '52-1148895',
  },
  {
    name: 'Enterprise Community Partners',
    category: 'Housing',
    mission: 'Making well-designed homes affordable and ensuring that communities become and remain places of pride, power, and belonging for everyone.',
    description: 'Enterprise Community Partners has invested more than $72 billion and created or preserved nearly 1 million affordable homes since its founding in 1982.',
    city: 'Columbia',
    state: 'MD',
    latitude: 39.2037,
    longitude: -76.8610,
    website: 'https://www.enterprisecommunity.org',
    contactEmail: 'info@enterprisecommunity.org',
    contactPhone: '(410) 964-1230',
    registrationNo: '52-1248823',
  },
  {
    name: 'National Alliance to End Homelessness',
    category: 'Housing',
    mission: 'Analyzing policy and developing pragmatic solutions to end homelessness in the United States.',
    description: 'The Alliance uses data and research to find evidence-based, cost-effective solutions to homelessness, then works collaboratively to make them part of federal, state, and local policy.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9076,
    longitude: -77.0369,
    website: 'https://endhomelessness.org',
    contactEmail: 'info@naeh.org',
    contactPhone: '(202) 638-1526',
    registrationNo: '52-1411257',
  },

  // ── Food Security (3) ──
  {
    name: 'Feeding America',
    category: 'Food Security',
    mission: 'Advancing change in America by ensuring equitable access to nutritious food for all through a nationwide network of food banks.',
    description: 'Feeding America is the largest hunger-relief organization in the United States, with a network of 200 food banks and 60,000 partner agencies serving every county.',
    city: 'Chicago',
    state: 'IL',
    latitude: 41.8781,
    longitude: -87.6298,
    website: 'https://www.feedingamerica.org',
    contactEmail: 'info@feedingamerica.org',
    contactPhone: '(800) 771-2303',
    registrationNo: '36-3673599',
  },
  {
    name: 'World Central Kitchen',
    category: 'Food Security',
    mission: 'Using the power of food to nourish communities and strengthen economies through times of older and newer crises.',
    description: 'Founded by Chef José Andrés, World Central Kitchen has served over 350 million fresh meals in response to natural disasters, conflicts, and humanitarian emergencies around the world.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9072,
    longitude: -77.0369,
    website: 'https://wck.org',
    contactEmail: 'info@wck.org',
    contactPhone: '(202) 844-6330',
    registrationNo: '27-2669291',
  },
  {
    name: 'No Kid Hungry',
    category: 'Food Security',
    mission: 'Ending childhood hunger in America by ensuring all children get the healthy food they need, every day.',
    description: 'No Kid Hungry, a campaign of Share Our Strength, connects kids to effective nutrition programs and teaches their families to cook affordable, healthy meals through cooking and nutrition education.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9052,
    longitude: -77.0336,
    website: 'https://www.nokidhungry.org',
    contactEmail: 'info@strength.org',
    contactPhone: '(800) 969-4767',
    registrationNo: '52-1367538',
  },

  // ── Animal Welfare (3) ──
  {
    name: 'ASPCA',
    category: 'Animal Welfare',
    mission: 'Providing effective means for the prevention of cruelty to animals throughout the United States.',
    description: 'The American Society for the Prevention of Cruelty to Animals was the first humane society established in North America (1866). It runs animal rescue, adoption, and advocacy programs nationwide.',
    city: 'New York',
    state: 'NY',
    latitude: 40.7856,
    longitude: -73.9519,
    website: 'https://www.aspca.org',
    contactEmail: 'publicinformation@aspca.org',
    contactPhone: '(888) 426-4435',
    registrationNo: '13-1623829',
  },
  {
    name: 'Best Friends Animal Society',
    category: 'Animal Welfare',
    mission: 'Leading the way to a no-kill country for cats and dogs by working collaboratively with shelters, rescue groups, and individuals.',
    description: 'Best Friends Animal Society runs the nation\'s largest no-kill animal sanctuary and partners with over 4,400 animal welfare organizations across the country to save the lives of cats and dogs.',
    city: 'Kanab',
    state: 'UT',
    latitude: 37.0474,
    longitude: -112.5263,
    website: 'https://bestfriends.org',
    contactEmail: 'info@bestfriends.org',
    contactPhone: '(435) 644-2001',
    registrationNo: '23-7147797',
  },
  {
    name: 'The Humane Society of the United States',
    category: 'Animal Welfare',
    mission: 'Fighting the big fights to end suffering for all animals through advocacy, education, and hands-on programs.',
    description: 'The HSUS is the most effective animal protection organization in the U.S., working to end puppy mills, factory farming, trophy hunting, animal testing, and other cruel practices.',
    city: 'Washington',
    state: 'DC',
    latitude: 38.9072,
    longitude: -77.0369,
    website: 'https://www.humanesociety.org',
    contactEmail: 'info@humanesociety.org',
    contactPhone: '(866) 720-2676',
    registrationNo: '53-0225390',
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    try {
      await sequelize.sync({ alter: true });
    } catch {
      await sequelize.sync();
    }
    console.log('Models synced');

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    let created = 0;

    for (let i = 0; i < SEED_ORGS.length; i++) {
      const orgData = SEED_ORGS[i];

      // Check if org already exists by name
      const existing = await Organization.findOne({ where: { name: orgData.name } });
      if (existing) {
        // Update registrationNo if missing
        if (!existing.registrationNo && orgData.registrationNo) {
          await existing.update({ registrationNo: orgData.registrationNo });
          console.log(`  🔄 Updated "${orgData.name}" with registrationNo ${orgData.registrationNo}`);
        } else {
          console.log(`  ⏭  Skipping "${orgData.name}" (already exists)`);
        }
        continue;
      }

      // Create a seed user for this org
      const emailSlug = orgData.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
      const seedEmail = `seed-${emailSlug}@catalyze.dev`;

      let user = await User.findOne({ where: { email: seedEmail } });
      if (!user) {
        user = await User.create({
          email: seedEmail,
          name: `${orgData.name} Admin`,
          passwordHash,
        });
      }

      await Organization.create({
        ...orgData,
        ownerId: user.id,
      });

      created++;
      console.log(`  ✅ Created "${orgData.name}" (${orgData.category})`);
    }

    console.log(`\nDone! Created ${created} organizations (${SEED_ORGS.length - created} already existed).`);
    console.log(`Seed accounts use password: ${SEED_PASSWORD}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
