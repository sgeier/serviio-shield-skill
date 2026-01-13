/**
 * Example usage of Serviio + Shield skill
 * Run: node example.js
 */

const ServiioShieldSkill = require('./dist/index.js').default;

async function main() {
  // Initialize skill with config
  const skill = new ServiioShieldSkill('./config.json');

  try {
    console.log('=== Serviio + Shield Skill Example ===\n');

    // Example 1: Play a movie
    console.log('1. Playing a movie...');
    const result = await skill.playMovie('Inception');
    console.log(result);
    console.log('');

    // Wait a bit
    await sleep(2000);

    // Example 2: Search library
    console.log('2. Searching library...');
    const movies = await skill.searchLibrary('Matrix', 5);
    console.log(`Found ${movies.length} results:`);
    movies.forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title}`);
    });
    console.log('');

    // Example 3: Pause playback
    console.log('3. Pausing playback...');
    const pauseResult = await skill.pausePlayback();
    console.log(pauseResult);
    console.log('');

    await sleep(2000);

    // Example 4: Resume playback
    console.log('4. Resuming playback...');
    const resumeResult = await skill.resumePlayback();
    console.log(resumeResult);
    console.log('');

    // Example 5: Stop playback
    console.log('5. Stopping playback...');
    const stopResult = await skill.stopPlayback();
    console.log(stopResult);
    console.log('');

    // Example 6: Wake TV only
    console.log('6. Waking TV...');
    const wakeResult = await skill.wakeTV();
    console.log(wakeResult);
    console.log('');

    // Cleanup
    console.log('Cleaning up...');
    await skill.disconnect();
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
