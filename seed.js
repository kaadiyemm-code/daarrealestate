const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Property = require('./models/Property');
const Worker = require('./models/Worker');
const Category = require('./models/Category');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realestate';

const seedData = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding...');

    // Ensure Admin Users exist
    const adminEmails = [
      { name: 'Admin Real Estate', email: 'admin@realestate.so', phone: '+252615000000' },
      { name: 'System Admin', email: 'admin@gmail.com', phone: '+252615111111' }
    ];

    for (const adm of adminEmails) {
      let u = await User.findOne({ email: adm.email });
      if (!u) {
        await User.create({
          name: adm.name,
          email: adm.email,
          password: 'password123',
          phone: adm.phone,
          role: 'Admin'
        });
        console.log(`Created admin user: ${adm.email} / password123`);
      } else {
        u.role = 'Admin';
        u.password = 'password123';
        await u.save();
        console.log(`Updated user ${adm.email} to Admin role and reset password`);
      }
    }

    const adminUser = await User.findOne({ email: 'admin@realestate.so' });

    // Seed Categories
    await Category.deleteMany({});
    await Category.insertMany([
      { name: 'Kirada', icon: 'key-outline', description: 'Guryaha kirada ah (Rental homes)' },
      { name: 'Iibka', icon: 'pricetag-outline', description: 'Guryaha iyo dhulka iibka ah (Properties for Sale)' },
      { name: 'Hotel', icon: 'bed-outline', description: 'Hoteellada iyo qolalka martida (Luxury Hotels & Suites)' },
      { name: 'Hool Aroos', icon: 'sparkles-outline', description: 'Hoolalka aroosyada iyo xafladaha (Wedding & Event Halls)' },
      { name: 'Villa', icon: 'home-outline', description: 'Guryaha waaweyn ee Villada ah' },
      { name: 'Apartment', icon: 'business-outline', description: 'Dabaqyada iyo guryaha dabaqa ah' },
      { name: 'Land', icon: 'map-outline', description: 'Dhul banaan oo ganacsi ama degaan' }
    ]);
    console.log('Categories seeded successfully');

    // Seed Properties (Rent, Sale, Hotel, Wedding Halls)
    await Property.deleteMany({});
    await Property.create([
      // --- 1. HOOLALKA AROOSYADA (WEDDING & EVENT HALLS) ---
      {
        title: 'Hoolka Jazeera Palace (Royal Wedding Hall)',
        description: 'Hoolka ugu casrisan uguna weyn magaalada Muqdisho oo loogu talagalay aroosyada heerka caalami, shirarka iyo xafladaha waaweyn. Waxaa ku jira masrax casri ah, codka (sound system), nalalka LED-ka, qaboojiyeyaal awood badan iyo goob baarkin aad u weyn.',
        propertyType: 'Wedding Hall',
        listingType: 'Wedding Hall',
        category: 'Hool Aroos',
        price: 1800,
        priceUnit: 'per event',
        currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1000&q=80',
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1000&q=80',
          'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1000&q=80',
          'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1000&q=80'
        ],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3250, 2.0420],
          address: 'KM4, Hodan District, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: true,
          hasAC: true,
          hasParking: true,
          hasPool: false,
          hasGym: false,
          bedrooms: 2, // bridal dressing suites
          bathrooms: 8,
          sqft: 12000,
          amenities: ['VIP Lounge', 'Backup Generator 250kVA', 'Bridal Dressing Suite', 'Security & CCTV', 'Projector & Big LED Screen']
        },
        hallDetails: {
          capacity: 1500, // Inta uu qaadi karo
          hasCatering: true, // Cunto ma leeyahay
          cateringDetails: 'Buffet buuxa oo cunto Soomaali, Carabi iyo Macmacaanka Arooska ah + Cabitaano dabiici ah',
          hasWaiters: true, // Adeegayaal / Servers ma leeyahay
          hasStage: true, // Masrax / Stage
          hasSoundSystem: true, // Codka & Sound
          hasProjector: true,
          hasDecorations: true
        },
        reviews: [
          {
            userName: 'Cabdiraxmaan Sh. Cali',
            rating: 5,
            comment: 'Arooskii walaalkey ayaan ku qabanay, adeegga cuntada iyo servers-ka aad bay u heer sareeyeen!'
          },
          {
            userName: 'Fadumo Xuseen',
            rating: 5,
            comment: 'Hool aad u ballaaran oo qurux badan, AC-ga aad buu u shaqaynayay.'
          }
        ],
        averageRating: 5.0,
        owner: adminUser._id
      },
      {
        title: 'Hoolka Sahafi Grand Ballroom & Banquet',
        description: 'Hool aroos iyo xaflado oo heer sare ah, ku yaal degmada Waberi. Waxay leedahay nalalka chandeliers, qurxinta miisaska arooska, adeegga cuntada (catering) iyo shaqaale heegan ah oo adeega.',
        propertyType: 'Wedding Hall',
        listingType: 'Wedding Hall',
        category: 'Hool Aroos',
        price: 1200,
        priceUnit: 'per event',
        currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1000&q=80',
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1000&q=80',
          'https://images.unsplash.com/photo-1544077960-604201fe74bc?w=1000&q=80'
        ],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3380, 2.0310],
          address: 'Taleex, Waberi District, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: false,
          hasAC: true,
          hasParking: true,
          hasPool: false,
          hasGym: false,
          bedrooms: 1,
          bathrooms: 6,
          sqft: 8500,
          amenities: ['Bridal Suite', 'Full Stage Lights', 'Sound Engineer Included', 'Standby Generator']
        },
        hallDetails: {
          capacity: 800,
          hasCatering: true,
          cateringDetails: 'Qado ama Casho aroos buuxda + Qaxwo iyo Macmacaan Soomaali',
          hasWaiters: true,
          hasStage: true,
          hasSoundSystem: true,
          hasProjector: true,
          hasDecorations: true
        },
        reviews: [
          {
            userName: 'Sharmaarke Nuur',
            rating: 4.8,
            comment: 'Aad bay u nidaamsanaayeen, servers-kuna waqtigii loogu talagalay ayay cuntada keeneen.'
          }
        ],
        averageRating: 4.8,
        owner: adminUser._id
      },
      {
        title: 'Lido Ocean Event & Wedding Arena',
        description: 'Hoolka xeebta Liido oo leh aragtida badda (ocean view), hawo dabiici ah iyo masrax weyn oo loogu talagalay xafladaha farxadda, aroosyada iyo xafladaha qalinjabinta.',
        propertyType: 'Wedding Hall',
        listingType: 'Wedding Hall',
        category: 'Hool Aroos',
        price: 1500,
        priceUnit: 'per event',
        currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1000&q=80',
          'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1000&q=80'
        ],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3620, 2.0490],
          address: 'Lido Beachfront, Abdiaziz, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: true,
          hasAC: true,
          hasParking: true,
          hasPool: false,
          hasGym: false,
          bedrooms: 2,
          bathrooms: 6,
          sqft: 10000,
          amenities: ['Sea View', 'Outdoor Lawn & Indoor Hall', 'Live Streaming Setup', 'Private Security']
        },
        hallDetails: {
          capacity: 1200,
          hasCatering: true,
          cateringDetails: 'Kalluun & Cunto badeed cusub + Cuntooyinka dhaqanka',
          hasWaiters: true,
          hasStage: true,
          hasSoundSystem: true,
          hasProjector: true,
          hasDecorations: true
        },
        reviews: [],
        averageRating: 5.0,
        owner: adminUser._id
      },

      // --- 2. GURYAHA KIRADA (FOR RENT) ---
      {
        title: 'Luxury 4-Bedroom Villa in Hodan',
        description: 'Villa aad u qurux badan oo leh solar awood leh, beer yar oo cagaaran, garaash 2 baabuur qaadaya iyo qolalka oo dhan oo leh AC.',
        propertyType: 'Villa',
        listingType: 'Rent',
        category: 'Kirada',
        price: 1200,
        priceUnit: 'per month',
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80'],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3182, 2.0469],
          address: 'Hodan District, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: true,
          hasAC: true,
          hasParking: true,
          hasPool: true,
          hasGym: false,
          bedrooms: 4,
          bathrooms: 3,
          sqft: 3200
        },
        owner: adminUser._id
      },
      {
        title: 'Modern 2-Bedroom Apartment in Waberi',
        description: 'Dabaq cusub oo dhowaan la dhisay, leh wiish (elevator), biyo 24 saac ah, koronto joogto ah iyo amni adag.',
        propertyType: 'Apartment',
        listingType: 'Rent',
        category: 'Kirada',
        price: 450,
        priceUnit: 'per month',
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3350, 2.0350],
          address: 'Waberi, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: true,
          hasAC: true,
          hasParking: true,
          hasPool: false,
          hasGym: false,
          bedrooms: 2,
          bathrooms: 2,
          sqft: 1100
        },
        owner: adminUser._id
      },

      // --- 3. GURYAHA & DHULKA IIBKA (FOR SALE) ---
      {
        title: 'Guri Dabaq Casri ah oo Iib ah - Yaqshid',
        description: 'Guri 2 dabaq ah oo cusub oo iib ah. Waxaa ku yaal 6 qol jiif, 4 musqul, kushiin weyn oo qalabeysan, iyo dukumiintiyo dowladeed oo sax ah.',
        propertyType: 'House',
        listingType: 'Sale',
        category: 'Iibka',
        price: 165000,
        priceUnit: 'total price',
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3410, 2.0620],
          address: 'Yaqshid District, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: true,
          hasAC: true,
          hasParking: true,
          hasPool: false,
          hasGym: false,
          bedrooms: 6,
          bathrooms: 4,
          sqft: 4500
        },
        owner: adminUser._id
      },
      {
        title: 'Dhul Ganacsi & Degaan oo Iib ah - Dayniile',
        description: 'Dhul cabirkiisu yahay 20x20m oo ku yaal meel laami ah oo ku habboon in laga dhiso guri dabaq ah ama ganacsi. Boondheere / Dayniile jidka weyn.',
        propertyType: 'Land',
        listingType: 'Sale',
        category: 'Iibka',
        price: 45000,
        priceUnit: 'total price',
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.2950, 2.0710],
          address: 'Dayniile Main Road, Mogadishu'
        },
        features: {
          hasWifi: false,
          hasBalcony: false,
          hasAC: false,
          hasParking: true,
          hasPool: false,
          hasGym: false,
          bedrooms: 0,
          bathrooms: 0,
          sqft: 4300
        },
        owner: adminUser._id
      },

      // --- 4. HOTEL SUITES (HOTEL BOOKING) ---
      {
        title: 'Equatorial Ocean Hotel Suite',
        description: 'Qolalka raaxada ee Hotel Equatorial oo leh daaqado u furan badda Liido, room service 24 saac ah, quraac bilaash ah, barkad dabbaal iyo jimicsi.',
        propertyType: 'Hotel',
        listingType: 'Hotel',
        category: 'Hotel',
        price: 120,
        priceUnit: 'per night',
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'],
        status: 'Available',
        location: {
          type: 'Point',
          coordinates: [45.3400, 2.0400],
          address: 'Lido Beach, Abdiaziz, Mogadishu'
        },
        features: {
          hasWifi: true,
          hasBalcony: true,
          hasAC: true,
          hasParking: true,
          hasPool: true,
          hasGym: true,
          bedrooms: 1,
          bathrooms: 1,
          sqft: 650
        },
        owner: adminUser._id
      }
    ]);
    await Property.updateMany({}, { approvalStatus: 'Approved' });
    console.log('Real estate, wedding halls, and hotel properties seeded successfully (All Approved)');

    // Seed Domestic Workers (Dadka Guriga / Home Services)
    await Worker.deleteMany({});
    await Worker.create([
      {
        name: 'Faadumo Cali Xasan',
        phone: '+252615234567',
        email: 'faadumo.clean@gmail.com',
        role: 'Nadiifiye Sare (Master House Cleaner)',
        category: 'Cleaning',
        city: 'Mogadishu',
        district: 'Hodan',
        experienceYears: 6,
        hourlyRate: 15,
        monthlyRate: 350,
        currency: 'USD',
        bio: 'Waxaan leeyahay khibrad 6 sano ah oo ku saabsan nadiifinta guryaha villooyinka ah iyo dabaqyada. Waxaan si heer sare ah u aqaan nadaafadda qoto-dheer (deep cleaning), feeraynta dharka, iyo jeermis-dilka.',
        skills: ['Deep Cleaning', 'Feeraynta Dharka', 'Nadiifinta Daaqadaha', 'Jeermis-dilka Musqulaha', 'Habeynta Qolalka'],
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
        portfolio: [
          {
            title: 'Nadiifin Qoto-dheer Villa 5 Qol ah',
            description: 'Nadiifin buuxda oo lagu sameeyay villa weyn oo ku taal degmada Hodan, oo ay ku jirto nadiifinta kushiinka iyo daaqadaha.',
            image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'
          },
          {
            title: 'Nadiifinta Guri Cusub (Move-in Cleaning)',
            description: 'Diyaarinta iyo nadiifinta guri dabaq ah oo cusub ka hor inta aan la degin Waberi.',
            image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80'
          }
        ],
        isVerified: true,
        availability: 'Available',
        rating: 5.0,
        reviews: [
          {
            userName: 'Maryan Cabdullaahi',
            rating: 5,
            comment: 'Faadumo waa qof aad u aamin ah, shaqadana si daacadnimo ah u qabata. Aad baan ugu qancay shaqadeeda!'
          },
          {
            userName: 'Axmed Kaariye',
            rating: 5,
            comment: 'Nadiifin aad u sarreysa ayay noo samaysay gurigayaga Hodan. Waan kula talinayaa qof walba.'
          }
        ],
        registeredBy: adminUser._id
      },
      {
        name: 'Axmed Nuur Cusmaan',
        phone: '+252615891234',
        email: 'axmed.electric@gmail.com',
        role: 'Farsamoyaqaan Koronto & Solar (Certified Electrician)',
        category: 'Electrical',
        city: 'Mogadishu',
        district: 'Waberi',
        experienceYears: 8,
        hourlyRate: 25,
        monthlyRate: 0,
        currency: 'USD',
        bio: 'Farsamoyaqaan shahaado haysta oo ku taqasusay nidaamyada korontada guryaha, rakibaadda nidaamka cadceedda (Solar Systems & Inverters), iyo xallinta cilladaha korontada degdegga ah.',
        skills: ['Wiring & Fiilooyinka', 'Solar Panel & Inverter', 'Generator Automatic Switch', 'Breakers & DB Box', 'LED & Chandelier Lighting'],
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80',
        portfolio: [
          {
            title: 'Rakibaadda Nidaam Solar 10kW ah',
            description: 'Ku rakibidda solar panels iyo 3 inverters oo awood badan villa weyn oo ku taal Taleex.',
            image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&q=80'
          },
          {
            title: 'Beddelka & Dib-u-habeynta Fiilooyinka Guri Dabaq ah',
            description: 'Cillad bixinta shoodhka korontada iyo beddelka safety breakers.',
            image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80'
          }
        ],
        isVerified: true,
        availability: 'Available',
        rating: 4.9,
        reviews: [
          {
            userName: 'Jaamac Warsame',
            rating: 5,
            comment: 'Axmed wuxuu noo hagaajiyay solar-ka guriga oo cilladaysnaa bilooyin. Daqiiqado gudahood ayuu ku xaliyay!'
          }
        ],
        registeredBy: adminUser._id
      },
      {
        name: 'Sacdiyo Maxamed Jaamac',
        phone: '+252615778899',
        email: 'sacdiyo.chef@gmail.com',
        role: 'Kariye & Cunto Kariye Xirfadle ah (Chef & Cook)',
        category: 'Cooking',
        city: 'Mogadishu',
        district: 'Shibis',
        experienceYears: 7,
        hourlyRate: 20,
        monthlyRate: 450,
        currency: 'USD',
        bio: 'Kariye khibrad 7 sano ah u leh karinta cuntooyinka Soomaaliga, Carabiga, iyo reer galbeedka. Waxaan diyaariyaa quraacda, qadada, cashada, macmacaanka, iyo cuntada xafladaha gaarka ah ee qoyska.',
        skills: ['Cuntooyinka Soomaaliga', 'Cuntooyinka Carabiga', 'Baasto & Hilib Suqaar', 'Sambuus & Macmacaan', 'Qurxinta Miiska Cuntada'],
        avatar: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80',
        portfolio: [
          {
            title: 'Cunto Diyaarinta Xaflad Qoys 60 Qof ah',
            description: 'Karinta bariis buuxa, hilib ari la dubay, maraq, saladhyo kala duwan iyo macmacaan.',
            image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80'
          },
          {
            title: 'Diyaarinta Sambuus & Macmacaan Gaar ah',
            description: 'Sambuus hilib iyo khudaar leh oo loogu talagalay marti-sharaf.',
            image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&q=80'
          }
        ],
        isVerified: true,
        availability: 'Available',
        rating: 5.0,
        reviews: [
          {
            userName: 'Safiyo Nuur',
            rating: 5,
            comment: 'Cuntada Sacdiyo waa mid dhadhan gaar ah leh, nadaafaddeeduna waa 100%. Waan ku faraxsanahay shaqadeeda.'
          }
        ],
        registeredBy: adminUser._id
      },
      {
        name: 'Cumar Cabdi Warsame',
        phone: '+252615445566',
        email: 'cumar.plumber@gmail.com',
        role: 'Tuubiste Sare (Master Plumber)',
        category: 'Plumbing',
        city: 'Mogadishu',
        district: 'Howlwadaag',
        experienceYears: 5,
        hourlyRate: 18,
        monthlyRate: 0,
        currency: 'USD',
        bio: 'Tuubiste xirfadle ah oo ku takhasusay rakibaadda tuubooyinka biyaha, matoorada biyaha (water pumps), biyo-kululeeyaha (water heaters), iyo xallinta daadashada biyaha.',
        skills: ['Rakibaadda Matoorada Biyaha', 'Dayactirka Dhuumaha Musqulaha', 'Biyo Kululeeye (Heater)', 'Xallinta Biyo Daadashada', 'Booyadaha Biyaha'],
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
        portfolio: [
          {
            title: 'Rakibaadda Matoor Automatic ah & Booyad 5000L',
            description: 'Isku xirka nidaamka biyaha degmada Howlwadaag oo leh filter biyaha sifeeya.',
            image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80'
          }
        ],
        isVerified: true,
        availability: 'Available',
        rating: 4.8,
        reviews: [
          {
            userName: 'Daahir Maxamuud',
            rating: 5,
            comment: 'Tuubooyinkii gurigayaga oo biyuhu ka daadanayeen ayuu si fiican noogu xaliyay. Waa nin karti leh.'
          }
        ],
        registeredBy: adminUser._id
      },
      {
        name: 'Xaliimo Ibraahim Yuusuf',
        phone: '+252615332211',
        email: 'xaliimo.nanny@gmail.com',
        role: 'Xannaaneeye Carruurta (Professional Nanny & Babysitter)',
        category: 'Childcare',
        city: 'Mogadishu',
        district: 'Wadajir',
        experienceYears: 5,
        hourlyRate: 12,
        monthlyRate: 280,
        currency: 'USD',
        bio: 'Xannaaneeye leh dulqaad, jacayl iyo aqoon ku saabsan xannaanada carruurta yaryar iyo kuwa dugsiga hoose. Waxaan ka caawiyaa waxbarashada aasaasiga ah, quudinta caafimaadka leh, iyo nadaafadda.',
        skills: ['Kalkaalisada Carruurta', 'Cunto Siinta & Nafaqada', 'Ciyaaraha Waxbarashada', 'First Aid / Gargaarka Degdegga ah', 'Hurinta & Nidaaminta Waqtiga'],
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
        portfolio: [
          {
            title: 'Xannaanada 2 Carruur ah oo 2 iyo 4 jir ah',
            description: 'Xannaano qoys oo joogto ah Wadajir, oo leh nidaam waxbarasho iyo cayaaro caafimaad leh.',
            image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80'
          }
        ],
        isVerified: true,
        availability: 'Available',
        rating: 5.0,
        reviews: [
          {
            userName: 'Shamso Maxamed',
            rating: 5,
            comment: 'Carruurtayda aad bay u jecel yihiin Xaliimo. Waa qof dabeecad wanaagsan oo lagu kalsoonaan karo.'
          }
        ],
        registeredBy: adminUser._id
      }
    ]);
    console.log('Domestic workers (Dadka Guriga) seeded successfully!');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
