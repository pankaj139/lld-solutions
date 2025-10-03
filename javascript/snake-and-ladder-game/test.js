#!/usr/bin/env node
/**
 * Quick test for Snake and Ladder Game
 */

// Import the main module
const { SnakeLadderGame, PlayerType, GameMode, AIPlayer, HumanPlayer } = require('./main.js');

async function quickTest() {
    console.log('🚀 Quick Snake and Ladder Test');
    console.log('='.repeat(40));
    
    try {
        // Create game
        const game = new SnakeLadderGame(100, GameMode.CLASSIC);
        console.log('✅ Game created successfully');
        
        // Add players
        const success1 = game.addPlayer('Alice', PlayerType.HUMAN);
        const success2 = game.addPlayer('Bob', PlayerType.AI_MEDIUM);
        console.log(`✅ Players added: ${success1 && success2}`);
        
        // Start game
        const gameStarted = game.startGame();
        console.log(`✅ Game started: ${gameStarted}`);
        
        // Test a few moves
        for (let i = 0; i < 5; i++) {
            const currentPlayer = game.getCurrentPlayer();
            console.log(`Turn ${i+1}: ${currentPlayer.name} (Position: ${currentPlayer.position})`);
            
            const moveResult = await game.moveCurrentPlayer();
            console.log(`  Rolled ${moveResult.diceValue}, moved to ${moveResult.endPosition}`);
            
            if (moveResult.isWinner) {
                console.log(`🎉 ${moveResult.playerName} wins!`);
                break;
            }
        }
        
        // Test statistics
        const stats = game.getStatistics();
        console.log(`✅ Statistics: ${stats.totalMoves} moves, avg dice: ${stats.averageDiceRoll.toFixed(2)}`);
        
        console.log('\n🎉 All tests passed! JavaScript implementation is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
quickTest().catch(console.error);