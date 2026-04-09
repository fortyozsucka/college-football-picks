const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('🚀 Starting data migration...');
  
  try {
    // Query existing games from the database
    console.log('📊 Checking for existing games...');
    const existingGames = await db.game.findMany();
    console.log(`Found ${existingGames.length} existing games`);
    
    if (existingGames.length === 0) {
      // Add some sample data for testing
      console.log('📝 Adding sample game data...');
      
      const sampleGames = [
        {
          cfbId: '401635551',
          week: 1,
          season: 2024,
          homeTeam: 'Alabama',
          awayTeam: 'Georgia',
          homeScore: null,
          awayScore: null,
          spread: -3.5,
          overUnder: 52.5,
          startTime: new Date('2024-09-07T19:30:00.000Z'),
          completed: false,
          winner: null
        },
        {
          cfbId: '401635552',
          week: 1,
          season: 2024,
          homeTeam: 'Ohio State',
          awayTeam: 'Michigan',
          homeScore: 31,
          awayScore: 24,
          spread: -7.0,
          overUnder: 48.5,
          startTime: new Date('2024-09-07T16:00:00.000Z'),
          completed: true,
          winner: 'Ohio State'
        },
        {
          cfbId: '401635553',
          week: 1,
          season: 2024,
          homeTeam: 'Texas',
          awayTeam: 'Oklahoma',
          homeScore: 28,
          awayScore: 21,
          spread: -2.5,
          overUnder: 55.5,
          startTime: new Date('2024-09-07T15:30:00.000Z'),
          completed: true,
          winner: 'Texas'
        }
      ];
      
      for (const gameData of sampleGames) {
        await db.game.create({
          data: gameData
        });
        console.log(`✅ Created game: ${gameData.awayTeam} @ ${gameData.homeTeam}`);
      }
      
      console.log(`🎉 Successfully added ${sampleGames.length} sample games!`);
    } else {
      console.log('ℹ️  Games already exist, skipping sample data creation.');
    }
    
    // Check for users
    console.log('👤 Checking for existing users...');
    const existingUsers = await db.user.findMany();
    console.log(`Found ${existingUsers.length} existing users`);
    
    if (existingUsers.length === 0) {
      console.log('📝 Adding sample user...');
      await db.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: '$2a$10$example.hash.here', // In real app, this would be properly hashed
          totalScore: 0
        }
      });
      console.log('✅ Created test user');
    }
    
    // Summary
    const finalGameCount = await db.game.count();
    const finalUserCount = await db.user.count();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Games: ${finalGameCount}`);
    console.log(`   Users: ${finalUserCount}`);
    console.log('\n🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();