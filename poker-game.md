# Poker Game (Texas Hold'em)

## 🔗 Implementation Links

- **Python Implementation**: [python/poker-game/main.py](python/poker-game/main.py)
- **JavaScript Implementation**: [javascript/poker-game/main.js](javascript/poker-game/main.js)

## Problem Statement

Design a Texas Hold'em poker game system that can:

1. **Manage card deck operations** including shuffling, dealing, and card representation
2. **Evaluate poker hands** accurately according to standard poker hand rankings (Royal Flush to High Card)
3. **Handle multiple players** with individual chip stacks and betting actions
4. **Implement betting rounds** (Pre-flop, Flop, Turn, River) with proper turn management
5. **Support betting actions** including fold, check, call, raise, and all-in
6. **Calculate pot distribution** including side pots for all-in scenarios
7. **Determine winners** by comparing hand strengths with accurate tie-breaking

## Requirements

### Functional Requirements

- Initialize standard 52-card deck with 4 suits and 13 ranks
- Shuffle deck using random algorithm ensuring fairness
- Deal two hole cards to each player at start of hand
- Deal community cards in stages (3 for flop, 1 for turn, 1 for river)
- Support 2-10 players per table
- Manage small blind and big blind positions rotating each hand
- Handle all betting actions (fold, check, call, raise, all-in) with validation
- Evaluate 5-card poker hands from 7 available cards (2 hole + 5 community)
- Compare hands to determine winner using standard poker rankings
- Distribute pot to winner(s), handling ties and side pots
- Track player chip stacks and eliminate players with zero chips

### Non-Functional Requirements

- Hand evaluation should execute in O(1) time using lookup tables or efficient algorithms
- Support hands with up to 10 players without performance degradation
- Betting validation should be instant (< 1ms)
- Card shuffle must be cryptographically random for fairness
- Side pot calculation must be accurate for complex all-in scenarios
- Clear console visualization of game state, cards, and betting actions

## Design Decisions

### Key Classes

1. **Card System**
   - `Card`: Represents individual playing card with rank and suit
   - `Deck`: Manages 52-card deck with shuffle and deal operations
   - `Rank`: Enum for card ranks (2-10, J, Q, K, A)
   - `Suit`: Enum for card suits (Hearts, Diamonds, Clubs, Spades)

2. **Hand Evaluation**
   - `Hand`: Represents 5-card poker hand with ranking evaluation
   - `HandRanking`: Enum for hand types (High Card to Royal Flush)
   - `HandEvaluator`: Evaluates best 5-card hand from 7 cards

3. **Player Management**
   - `Player`: Represents player with hole cards, chips, and betting state
   - `PlayerAction`: Enum for betting actions (Fold, Check, Call, Raise, AllIn)
   - `PlayerState`: Tracks whether player is active, folded, or all-in

4. **Game Flow**
   - `PokerGame`: Main game controller managing rounds and betting
   - `GameStage`: Enum for betting rounds (PreFlop, Flop, Turn, River, Showdown)
   - `Pot`: Manages main pot and side pots for payouts
   - `BettingRound`: Handles one round of betting with turn rotation

### Design Patterns Used

1. **Strategy Pattern**: Different hand evaluation strategies for various poker variants
2. **State Pattern**: Game stage management (PreFlop → Flop → Turn → River → Showdown)
3. **Chain of Responsibility**: Hand ranking evaluation chain (check flush, then straight, etc.)
4. **Factory Pattern**: Card and Hand creation with validation
5. **Observer Pattern**: Players observe game events (cards dealt, bets made, pot updates)
6. **Command Pattern**: Betting actions as command objects with validation and execution

### Key Features

- **Accurate Hand Ranking**: Correctly evaluates all poker hands including edge cases
- **Side Pot Management**: Handles multiple all-in scenarios with proper pot distribution
- **Blind Rotation**: Dealer button rotates clockwise each hand
- **Betting Validation**: Prevents invalid actions (raising less than minimum, checking when bet exists)
- **Best Hand Selection**: Chooses optimal 5-card combination from 7 available cards

## State Diagram

```text
WAITING
  ↓ (start_hand)
PRE_FLOP (deal 2 hole cards to each player)
  ↓ (betting_round)
  ├─→ (all_fold) → SHOWDOWN → WAITING
  └─→ (betting_complete)
FLOP (deal 3 community cards)
  ↓ (betting_round)
  ├─→ (all_fold) → SHOWDOWN → WAITING
  └─→ (betting_complete)
TURN (deal 1 community card)
  ↓ (betting_round)
  ├─→ (all_fold) → SHOWDOWN → WAITING
  └─→ (betting_complete)
RIVER (deal 1 community card)
  ↓ (betting_round)
  ├─→ (all_fold) → SHOWDOWN → WAITING
  └─→ (betting_complete)
SHOWDOWN (reveal hands, determine winner)
  ↓ (distribute_pot)
WAITING
```

## Class Diagram

```text
Rank (Enum)
├── TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN
├── JACK, QUEEN, KING, ACE

Suit (Enum)
├── HEARTS, DIAMONDS, CLUBS, SPADES

Card
├── rank: Rank
├── suit: Suit
└── __str__() → str (e.g., "A♠")

Deck
├── cards: List[Card]
├── shuffle() → None
├── deal() → Card
└── reset() → None

HandRanking (Enum)
├── HIGH_CARD = 1
├── ONE_PAIR = 2
├── TWO_PAIR = 3
├── THREE_OF_A_KIND = 4
├── STRAIGHT = 5
├── FLUSH = 6
├── FULL_HOUSE = 7
├── FOUR_OF_A_KIND = 8
├── STRAIGHT_FLUSH = 9
└── ROYAL_FLUSH = 10

Hand
├── cards: List[Card] (5 cards)
├── ranking: HandRanking
├── rank_values: List[int] (for tie-breaking)
├── evaluate() → HandRanking
└── compare(other: Hand) → int (-1, 0, 1)

HandEvaluator
├── evaluate_hand(cards: List[Card]) → Hand
├── find_best_hand(seven_cards: List[Card]) → Hand
└── _check_ranking_methods() → HandRanking

PlayerAction (Enum)
├── FOLD, CHECK, CALL, RAISE, ALL_IN

PlayerState (Enum)
├── ACTIVE, FOLDED, ALL_IN

Player
├── name: str
├── chips: int
├── hole_cards: List[Card]
├── current_bet: int
├── total_bet: int
├── state: PlayerState
├── make_bet(amount: int) → bool
├── fold() → None
└── get_best_hand(community_cards) → Hand

Pot
├── main_pot: int
├── side_pots: List[Tuple[int, List[Player]]]
├── add_chips(amount: int) → None
└── distribute(winners: List[Player]) → None

GameStage (Enum)
├── WAITING, PRE_FLOP, FLOP, TURN, RIVER, SHOWDOWN

BettingRound
├── players: List[Player]
├── current_bet: int
├── min_raise: int
├── process_action(player, action, amount) → bool
└── is_complete() → bool

PokerGame
├── players: List[Player]
├── deck: Deck
├── community_cards: List[Card]
├── pot: Pot
├── stage: GameStage
├── dealer_position: int
├── small_blind: int
├── big_blind: int
├── start_hand() → None
├── deal_flop() → None
├── deal_turn() → None
├── deal_river() → None
├── run_betting_round() → None
└── determine_winners() → List[Player]
```

## Usage Example

```python
# Create game with 4 players
game = PokerGame(
    player_names=["Alice", "Bob", "Charlie", "Diana"],
    starting_chips=1000,
    small_blind=10,
    big_blind=20
)

# Play one hand
game.start_hand()

# Pre-flop betting
game.run_betting_round()  # Players make decisions

# Deal flop
game.deal_flop()
game.run_betting_round()

# Deal turn
game.deal_turn()
game.run_betting_round()

# Deal river
game.deal_river()
game.run_betting_round()

# Showdown
winners = game.determine_winners()
game.distribute_pot(winners)

# Display results
print(f"Winner: {winners[0].name}")
print(f"Winning hand: {winners[0].get_best_hand(game.community_cards)}")
```

## Business Rules

1. **Blind Rules**
   - Small blind posts half the minimum bet before cards are dealt
   - Big blind posts full minimum bet before cards are dealt
   - Dealer button rotates clockwise after each hand
   - Player to the left of big blind acts first pre-flop
   - Player to the left of dealer acts first on flop, turn, and river

2. **Betting Rules**
   - Minimum raise must be at least the size of the previous bet or raise
   - Player can only bet up to their total chip stack (all-in)
   - Check is only valid if no bet has been made in current round
   - Call matches the current highest bet in the round
   - Betting round ends when all active players have acted and matched the highest bet

3. **Hand Evaluation Rules**
   - Best 5-card hand is selected from player's 2 hole cards + 5 community cards
   - Royal Flush beats all other hands (A-K-Q-J-10 of same suit)
   - Ties are broken by comparing rank values in order
   - If hands are identical, pot is split equally among winners

4. **Pot Distribution Rules**
   - Player can only win chips up to their total investment in each pot
   - Side pots created when player goes all-in for less than current bet
   - Main pot awarded first, then side pots in order of creation
   - Ties result in pot being split equally (rounded down to nearest chip)

5. **Player Elimination Rules**
   - Player with zero chips is eliminated from game
   - Game continues until only one player remains with chips
   - Final player is declared winner
   - Players can rebuy chips (optional feature)

## Extension Points

1. **Multiple Poker Variants**: Add Omaha, Seven-Card Stud, Five-Card Draw
2. **Tournament Mode**: Multi-table tournaments with increasing blinds
3. **AI Players**: Implement AI with different playing styles (tight, aggressive, loose)
4. **Hand History**: Record and replay complete hand histories
5. **Statistics Tracking**: Player stats (hands played, win rate, showdown percentage)
6. **Table Chat**: Text chat functionality between players
7. **Animation**: Animated card dealing and chip movements
8. **Multi-Currency**: Support different chip denominations and cash games

## Security Considerations

- **Deck Shuffling**: Use cryptographically secure random number generator
- **Hole Card Privacy**: Ensure player's hole cards are not visible to others
- **Action Validation**: Validate all player actions server-side to prevent cheating
- **Pot Calculation**: Double-check pot math to prevent chip discrepancies
- **Hand Evaluation**: Use trusted hand evaluation library to prevent disputes

## Time Complexity

- **Hand Evaluation**: O(1) using lookup tables or O(n) for straightforward algorithm where n=7
- **Best Hand Selection**: O(C(7,5)) = O(21) constant time for all 5-card combinations
- **Pot Distribution**: O(p) where p is number of players for side pot calculation
- **Betting Round**: O(p×r) where p is players and r is raises in one round
- **Winner Determination**: O(p log p) for sorting hands of active players
- **Deck Shuffle**: O(52) = O(1) for Fisher-Yates shuffle

## Space Complexity

- O(52) for deck storage (constant)
- O(p) where p is number of players for player data
- O(5) = O(1) for community cards
- O(p) for pot and side pot management
- O(1) for game state and betting round data
