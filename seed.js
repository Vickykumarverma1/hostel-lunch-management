require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');
const Admin = require('./models/Admin');

// CSV student data
const csvData = [
  ["Abia","9047880107","43","GL Bajaj College","13:05"],
  ["Alger","8407187854","74","GNAT College","13:15"],
  ["Ammar","2382098194","81","Galgotia College","12:25"],
  ["Arda","4064935694","61","AIMS College","12:45"],
  ["Arly","8177229068","59","Mangalmay College","12:50"],
  ["Balius","9014773009","27","Galgotia College","12:25"],
  ["Baxley","3629995895","87","GL Bajaj College","13:05"],
  ["Baylen","9736540424","29","KCC College","12:30"],
  ["Bracken","7977189109","22","GL Bajaj College","13:05"],
  ["Cade","4128309830","34","GNAT College","13:15"],
  ["Callen","4080236971","26","KCC College","12:30"],
  ["Chay","4017304814","39","GNAT College","13:15"],
  ["Corin","3265642131","9","GL Bajaj College","13:05"],
  ["Dabney","6148269814","20","GNAT College","13:15"],
  ["Dariyan","5914128039","76","KCC College","12:30"],
  ["Dawood","2578194276","69","KCC College","12:30"],
  ["Dayton","4827172002","24","KCC College","12:30"],
  ["Edlin","6397111722","90","Galgotia College","12:25"],
  ["Enes","4929630667","68","GNAT College","13:15"],
  ["Evyn","2232940307","78","Galgotia College","12:25"],
  ["Ezana","5283005956","58","Galgotia College","12:25"],
  ["Faelan","1202156973","18","Mangalmay College","12:50"],
  ["Faiz","9592758344","85","AIMS College","12:45"],
  ["Feichin","3596310484","41","Galgotia College","12:25"],
  ["Felton","6567830413","98","AIMS College","12:45"],
  ["Fyndlay","4296375598","100","AIMS College","12:45"],
  ["Gabie","2319640217","96","Mangalmay College","12:50"],
  ["Garson","5472779281","66","KCC College","12:30"],
  ["Gilson","2925375781","91","AIMS College","12:45"],
  ["Gwion","1739261250","94","AIMS College","12:45"],
  ["Hadley","4796168949","60","AIMS College","12:45"],
  ["Haidar","5404829533","49","GL Bajaj College","13:05"],
  ["Hao","8320017316","42","Mangalmay College","12:50"],
  ["Haytham","6521888925","51","Mangalmay College","12:50"],
  ["Ilias","4643123613","36","GL Bajaj College","13:05"],
  ["Innis","7912654239","45","Galgotia College","12:25"],
  ["Iver","7428242750","77","AIMS College","12:45"],
  ["Iwan","6513410862","14","KCC College","12:30"],
  ["Jeno","1016885958","33","Galgotia College","12:25"],
  ["Jibril","7090814695","25","GNAT College","13:15"],
  ["Jorey","3921684340","37","Mangalmay College","12:50"],
  ["Jovian","3430663844","65","Mangalmay College","12:50"],
  ["Jura","4799344731","55","AIMS College","12:45"],
  ["Keane","8392454461","17","GL Bajaj College","13:05"],
  ["Keegan","4582519188","53","Galgotia College","12:25"],
  ["Koji","9068221751","67","Mangalmay College","12:50"],
  ["Kyrone","5875312172","88","Galgotia College","12:25"],
  ["Laith","7627951661","10","GNAT College","13:15"],
  ["Loel","9902392342","8","GL Bajaj College","13:05"],
  ["Lorcan","4113142225","44","GL Bajaj College","13:05"],
  ["Lorik","2621745978","92","KCC College","12:30"],
  ["Ludo","2432438745","46","GNAT College","13:15"],
  ["Mael","8207614231","21","Galgotia College","12:25"],
  ["Manley","6486823393","72","Mangalmay College","12:50"],
  ["Mika","6140306034","30","Galgotia College","12:25"],
  ["Morrow","5715400694","4","GL Bajaj College","13:05"],
  ["Myloe","5026243763","12","GNAT College","13:15"],
  ["Neas","9305794130","56","Mangalmay College","12:50"],
  ["Nestor","5953244226","11","KCC College","12:30"],
  ["Nickson","3895605280","50","Galgotia College","12:25"],
  ["Nojus","1366760442","48","GL Bajaj College","13:05"],
  ["Nur","1233932264","57","AIMS College","12:45"],
  ["Orestes","7852357201","3","GNAT College","13:15"],
  ["Orlan","8045910260","52","GL Bajaj College","13:05"],
  ["Oshin","4813390383","54","Galgotia College","12:25"],
  ["Otto","8210515872","16","GL Bajaj College","13:05"],
  ["Payce","5341704139","5","Mangalmay College","12:50"],
  ["Pepper","9425024378","47","GNAT College","13:15"],
  ["Pernell","3859742822","73","Mangalmay College","12:50"],
  ["Pierse","4281675759","83","GNAT College","13:15"],
  ["Quasay","5647022074","63","GL Bajaj College","13:05"],
  ["Quetzal","5257096862","99","Galgotia College","12:25"],
  ["Quinton","6700274272","97","Galgotia College","12:25"],
  ["Rae","8537234181","13","GL Bajaj College","13:05"],
  ["Ransford","9578246541","70","AIMS College","12:45"],
  ["Reuel","1035041662","93","Mangalmay College","12:50"],
  ["Ronnell","2778190927","80","Mangalmay College","12:50"],
  ["Ryden","4960576753","95","GNAT College","13:15"],
  ["Sarvin","5626269487","6","GL Bajaj College","13:05"],
  ["Shanley","3069796881","38","GL Bajaj College","13:05"],
  ["Skie","2748758832","64","AIMS College","12:45"],
  ["Sorren","3336120310","28","Galgotia College","12:25"],
  ["Tace","6551047349","32","GL Bajaj College","13:05"],
  ["Tai","3485256267","23","KCC College","12:30"],
  ["Torrin","7158586627","62","GNAT College","13:15"],
  ["Tymon","1227101138","75","KCC College","12:30"],
  ["Upton","3375395938","1","KCC College","12:30"],
  ["Uriel","9367398561","19","GNAT College","13:15"],
  ["Vato","7064303237","7","Galgotia College","12:25"],
  ["Vero","5435824133","86","AIMS College","12:45"],
  ["Vila","4137283302","35","GNAT College","13:15"],
  ["Willard","8316181870","82","AIMS College","12:45"],
  ["Winter","4018146673","84","Galgotia College","12:25"],
  ["Wisdom","6289178196","79","GL Bajaj College","13:05"],
  ["Wynton","9973166120","31","GL Bajaj College","13:05"],
  ["Yardley","6220057611","89","GL Bajaj College","13:05"],
  ["Yaro","2333341382","71","GL Bajaj College","13:05"],
  ["Zenas","3554132293","15","GNAT College","13:15"],
  ["Zephyr","2105880759","2","GNAT College","13:15"],
  ["Zian","1675495583","40","Galgotia College","12:25"]
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Seed admin
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      await Admin.create({ username: 'admin', password: 'admin123' });
      console.log('✅ Admin created (admin / admin123)');
    } else {
      console.log('ℹ️  Admin already exists, skipping.');
    }

    // Seed students
    let added = 0;
    for (const row of csvData) {
      const [name, phone, room, college, time] = row;
      const exists = await Student.findOne({ phone });
      if (exists) continue;

      await Student.create({
        name,
        phone,
        password: '12345',
        college,
        roomNumber: room,
        lunchTime: time,
        status: 'approved'
      });
      added++;
    }

    console.log(`✅ Seeded ${added} students (${100 - added} already existed).`);
    console.log('🎉 Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
