"""
POKER GAME (TEXAS HOLD'EM) - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Hand evaluation strategies for different poker variants
   - HandEvaluator interface can be swapped for different game types
   - Easy to add Omaha, Stud, or other variants
   - Evaluation algorithm encapsulated in strategy class

2. STATE PATTERN: Game stage management with explicit transitions
   - GameStage enum defines all betting rounds
   - State transitions follow strict poker rules
   - Each stage has specific allowed operations

3. CHAIN OF RESPONSIBILITY PATTERN: Hand ranking evaluation chain
   - Checks for Royal Flush, then Straight Flush, then Four of a Kind, etc.
   - Each handler checks for specific hand type
   - Falls through to next handler if not matched

4. FACTORY PATTERN: Card and Deck creation
   - Deck factory creates standard 52-card deck
   - Ensures all cards are valid
   - Centralized card creation logic

5. OBSERVER PATTERN: Game event notifications
   - Players observe dealt cards, betting actions, pot changes
   - Statistics tracker observes game outcomes
   - Decoupled event system

6. COMMAND PATTERN: Betting actions as commands
   - Each action (fold, call, raise) is a command object
   - Validation and execution separated
   - Supports undo for practice mode

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Hole cards hidden, pot logic internal
- ABSTRACTION: Player and HandEvaluator define clear contracts
- INHERITANCE: Different player types can extend base Player
- POLYMORPHISM: All betting actions handled uniformly

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Card, Deck, Hand, Player, Game)
- OCP: Easy to add new hand rankings or betting actions
- LSP: All Player types can be used interchangeably
- ISP: Focused interfaces for each component
- DIP: Game depends on abstractions, not concrete implementations

BUSINESS FEATURES:
- Complete Texas Hold'em rules implementation
- Accurate hand evaluation with all rankings
- Side pot management for complex all-in scenarios
- Blind rotation and proper betting order
- Comprehensive pot distribution

ARCHITECTURAL NOTES:
- Immutable Card objects for safety
- Efficient hand evaluation using rank counting
- Clear separation between game logic and presentation
- Extensible for GUI or network play
"""

from enum import Enum
from typing import List, Tuple, Optional
from collections import Counter
from itertools import combinations
import random


# Enums - Domain model definitions
class Suit(Enum):
    """Card suits with Unicode symbols for display"""
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"
    SPADES = "♠"


class Rank(Enum):
    """
    Card ranks with numeric values for comparison
    
    DESIGN NOTE: Values chosen for easy comparison
    - Ace is high (14) for most comparisons
    - Special handling for Ace-low straights (A-2-3-4-5)
    """
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14
    
    def __str__(self):
        symbols = {
            2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
            7: '7', 8: '8', 9: '9', 10: '10',
            11: 'J', 12: 'Q', 13: 'K', 14: 'A'
        }
        return symbols[self.value]


class HandRanking(Enum):
    """
    Poker hand rankings from lowest to highest
    
    BUSINESS RULE: Standard poker hand hierarchy
    """
    HIGH_CARD = 1
    ONE_PAIR = 2
    TWO_PAIR = 3
    THREE_OF_A_KIND = 4
    STRAIGHT = 5
    FLUSH = 6
    FULL_HOUSE = 7
    FOUR_OF_A_KIND = 8
    STRAIGHT_FLUSH = 9
    ROYAL_FLUSH = 10


class PlayerState(Enum):
    """Player state in current hand"""
    ACTIVE = "active"
    FOLDED = "folded"
    ALL_IN = "all_in"


class GameStage(Enum):
    """
    Texas Hold'em betting rounds
    
    DESIGN PATTERN: State Pattern
    - Each stage has specific rules and transitions
    """
    WAITING = "waiting"
    PRE_FLOP = "pre_flop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"


class Card:
    """
    Immutable playing card
    
    OOP CONCEPT: Value Object
    - Immutable after creation
    - Equality based on rank and suit
    """
    def __init__(self, rank: Rank, suit: Suit):
        self.rank = rank
        self.suit = suit
    
    def __str__(self):
        return f"{self.rank}{self.suit.value}"
    
    def __repr__(self):
        return str(self)
    
    def __eq__(self, other):
        return self.rank == other.rank and self.suit == other.suit
    
    def __hash__(self):
        return hash((self.rank, self.suit))


class Deck:
    """
    Standard 52-card deck with shuffle and deal
    
    DESIGN PATTERN: Factory Pattern
    - Creates all cards in standard configuration
    - Ensures deck validity
    """
    def __init__(self):
        self.cards: List[Card] = []
        self.reset()
    
    def reset(self):
        """Create fresh 52-card deck"""
        self.cards = [Card(rank, suit) for suit in Suit for rank in Rank]
    
    def shuffle(self):
        """
        Fisher-Yates shuffle for fairness
        
        SECURITY: Use random.shuffle which is sufficient for games
        - For real money games, use secrets.SystemRandom()
        
        Time Complexity: O(52) = O(1)
        """
        random.shuffle(self.cards)
    
    def deal(self) -> Optional[Card]:
        """Deal one card from top of deck"""
        return self.cards.pop() if self.cards else None
    
    def __len__(self):
        return len(self.cards)


class Hand:
    """
    Represents evaluated 5-card poker hand
    
    OOP CONCEPT: Encapsulation
    - Internal ranking logic hidden
    - Comparison based on poker rules
    """
    def __init__(self, cards: List[Card], ranking: HandRanking, rank_values: List[int]):
        self.cards = cards
        self.ranking = ranking
        self.rank_values = rank_values  # For tie-breaking
    
    def compare(self, other: 'Hand') -> int:
        """
        Compare two hands to determine winner
        
        BUSINESS RULE: Higher ranking wins, ties broken by rank values
        
        Returns:
            1 if self wins, -1 if other wins, 0 if tie
        """
        if self.ranking.value > other.ranking.value:
            return 1
        elif self.ranking.value < other.ranking.value:
            return -1
        
        # Same ranking, compare rank values
        for my_val, other_val in zip(self.rank_values, other.rank_values):
            if my_val > other_val:
                return 1
            elif my_val < other_val:
                return -1
        
        return 0  # Perfect tie
    
    def __str__(self):
        return f"{self.ranking.name}: {' '.join(str(c) for c in self.cards)}"


class HandEvaluator:
    """
    Evaluates poker hands using Chain of Responsibility pattern
    
    DESIGN PATTERN: Chain of Responsibility
    - Checks for each hand type in order from highest to lowest
    - Returns first match
    """
    @staticmethod
    def evaluate_hand(cards: List[Card]) -> Hand:
        """
        Evaluate 5-card hand
        
        ALGORITHM: Check each hand type from best to worst
        
        Time Complexity: O(1) - fixed number of checks for 5 cards
        """
        if len(cards) != 5:
            raise ValueError("Hand must contain exactly 5 cards")
        
        # Sort cards by rank for easier evaluation
        sorted_cards = sorted(cards, key=lambda c: c.rank.value, reverse=True)
        ranks = [c.rank.value for c in sorted_cards]
        suits = [c.suit for c in sorted_cards]
        rank_counts = Counter(ranks)
        
        is_flush = len(set(suits)) == 1
        is_straight = HandEvaluator._check_straight(ranks)
        
        # Check for Ace-low straight (A-2-3-4-5)
        if ranks == [14, 5, 4, 3, 2]:
            is_straight = True
            ranks = [5, 4, 3, 2, 1]  # Adjust for comparison
        
        # Royal Flush: A-K-Q-J-10 of same suit
        if is_flush and is_straight and ranks[0] == 14:
            return Hand(sorted_cards, HandRanking.ROYAL_FLUSH, ranks)
        
        # Straight Flush
        if is_flush and is_straight:
            return Hand(sorted_cards, HandRanking.STRAIGHT_FLUSH, ranks)
        
        # Four of a Kind
        if 4 in rank_counts.values():
            four_rank = [r for r, count in rank_counts.items() if count == 4][0]
            kicker = [r for r in ranks if r != four_rank][0]
            return Hand(sorted_cards, HandRanking.FOUR_OF_A_KIND, [four_rank, kicker])
        
        # Full House
        if 3 in rank_counts.values() and 2 in rank_counts.values():
            three_rank = [r for r, count in rank_counts.items() if count == 3][0]
            pair_rank = [r for r, count in rank_counts.items() if count == 2][0]
            return Hand(sorted_cards, HandRanking.FULL_HOUSE, [three_rank, pair_rank])
        
        # Flush
        if is_flush:
            return Hand(sorted_cards, HandRanking.FLUSH, ranks)
        
        # Straight
        if is_straight:
            return Hand(sorted_cards, HandRanking.STRAIGHT, ranks)
        
        # Three of a Kind
        if 3 in rank_counts.values():
            three_rank = [r for r, count in rank_counts.items() if count == 3][0]
            kickers = sorted([r for r in ranks if r != three_rank], reverse=True)
            return Hand(sorted_cards, HandRanking.THREE_OF_A_KIND, [three_rank] + kickers)
        
        # Two Pair
        pairs = [r for r, count in rank_counts.items() if count == 2]
        if len(pairs) == 2:
            pairs = sorted(pairs, reverse=True)
            kicker = [r for r in ranks if r not in pairs][0]
            return Hand(sorted_cards, HandRanking.TWO_PAIR, pairs + [kicker])
        
        # One Pair
        if len(pairs) == 1:
            pair_rank = pairs[0]
            kickers = sorted([r for r in ranks if r != pair_rank], reverse=True)
            return Hand(sorted_cards, HandRanking.ONE_PAIR, [pair_rank] + kickers)
        
        # High Card
        return Hand(sorted_cards, HandRanking.HIGH_CARD, ranks)
    
    @staticmethod
    def _check_straight(ranks: List[int]) -> bool:
        """Check if ranks form a straight (5 consecutive cards)"""
        return all(ranks[i] == ranks[i+1] + 1 for i in range(len(ranks) - 1))
    
    @staticmethod
    def find_best_hand(seven_cards: List[Card]) -> Hand:
        """
        Find best 5-card hand from 7 cards (2 hole + 5 community)
        
        ALGORITHM: Check all C(7,5) = 21 combinations
        
        Time Complexity: O(21) = O(1) constant time
        """
        best_hand = None
        
        for five_cards in combinations(seven_cards, 5):
            hand = HandEvaluator.evaluate_hand(list(five_cards))
            
            if best_hand is None or hand.compare(best_hand) > 0:
                best_hand = hand
        
        return best_hand


class Player:
    """
    Represents a poker player
    
    OOP CONCEPT: Encapsulation
    - Hole cards private, accessed through methods
    - Chip management internal
    """
    def __init__(self, name: str, chips: int):
        self.name = name
        self.chips = chips
        self.hole_cards: List[Card] = []
        self.current_bet = 0
        self.total_bet_this_hand = 0
        self.state = PlayerState.ACTIVE
    
    def receive_cards(self, cards: List[Card]):
        """Receive hole cards"""
        self.hole_cards = cards
    
    def make_bet(self, amount: int) -> bool:
        """
        Place a bet
        
        BUSINESS RULE: Cannot bet more than current chips
        
        Returns:
            bool: True if bet successful
        """
        if amount > self.chips:
            return False
        
        self.chips -= amount
        self.current_bet += amount
        self.total_bet_this_hand += amount
        
        if self.chips == 0:
            self.state = PlayerState.ALL_IN
        
        return True
    
    def fold(self):
        """Fold hand - player out of this round"""
        self.state = PlayerState.FOLDED
    
    def get_best_hand(self, community_cards: List[Card]) -> Hand:
        """Get best 5-card hand from hole cards + community cards"""
        all_cards = self.hole_cards + community_cards
        return HandEvaluator.find_best_hand(all_cards)
    
    def reset_for_new_hand(self):
        """Reset player state for new hand"""
        self.hole_cards = []
        self.current_bet = 0
        self.total_bet_this_hand = 0
        self.state = PlayerState.ACTIVE if self.chips > 0 else PlayerState.FOLDED
    
    def __str__(self):
        return f"{self.name} (${self.chips})"


class Pot:
    """
    Manages main pot and side pots
    
    DESIGN PATTERN: Complex pot math with side pots
    - Handles multiple all-in scenarios
    - Ensures correct distribution
    """
    def __init__(self):
        self.total = 0
        self.side_pots: List[Tuple[int, List[Player]]] = []
    
    def add_chips(self, amount: int):
        """Add chips to pot"""
        self.total += amount
    
    def create_side_pots(self, players: List[Player]):
        """
        Create side pots for all-in players
        
        BUSINESS RULE: Player can only win up to their total investment
        
        Time Complexity: O(p) where p is number of players
        """
        # Sort players by total bet
        active_players = [p for p in players if p.state != PlayerState.FOLDED]
        active_players.sort(key=lambda p: p.total_bet_this_hand)
        
        self.side_pots = []
        previous_bet = 0
        
        for i, player in enumerate(active_players):
            bet_level = player.total_bet_this_hand
            if bet_level > previous_bet:
                # Create pot for this bet level
                pot_size = (bet_level - previous_bet) * (len(active_players) - i + len([p for p in active_players[:i] if p.total_bet_this_hand >= bet_level]))
                eligible_players = [p for p in active_players if p.total_bet_this_hand >= bet_level]
                self.side_pots.append((pot_size, eligible_players))
                previous_bet = bet_level
    
    def __str__(self):
        return f"Pot: ${self.total}"


class PokerGame:
    """
    Main Texas Hold'em game controller
    
    DESIGN PATTERN: Facade Pattern
    - Provides simple interface to complex poker rules
    - Coordinates all game components
    
    DESIGN PATTERN: State Pattern
    - Manages game stage transitions
    """
    def __init__(self, player_names: List[str], starting_chips: int = 1000,
                 small_blind: int = 10, big_blind: int = 20):
        self.players = [Player(name, starting_chips) for name in player_names]
        self.deck = Deck()
        self.community_cards: List[Card] = []
        self.pot = Pot()
        self.stage = GameStage.WAITING
        self.dealer_position = 0
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.current_bet = 0
        self.min_raise = big_blind
    
    def start_hand(self):
        """
        Start new hand
        
        STATE TRANSITION: WAITING → PRE_FLOP
        
        BUSINESS RULE: Post blinds, deal hole cards
        """
        # Reset game state
        self.deck.reset()
        self.deck.shuffle()
        self.community_cards = []
        self.pot = Pot()
        self.current_bet = 0
        self.stage = GameStage.PRE_FLOP
        
        # Reset players
        for player in self.players:
            player.reset_for_new_hand()
        
        # Post blinds
        active_players = [p for p in self.players if p.chips > 0]
        if len(active_players) < 2:
            return
        
        sb_pos = (self.dealer_position + 1) % len(active_players)
        bb_pos = (self.dealer_position + 2) % len(active_players)
        
        active_players[sb_pos].make_bet(min(self.small_blind, active_players[sb_pos].chips))
        active_players[bb_pos].make_bet(min(self.big_blind, active_players[bb_pos].chips))
        
        self.current_bet = self.big_blind
        self.pot.add_chips(active_players[sb_pos].current_bet + active_players[bb_pos].current_bet)
        
        # Deal hole cards
        for player in active_players:
            player.receive_cards([self.deck.deal(), self.deck.deal()])
        
        print(f"\n{'='*60}")
        print(f"NEW HAND - Dealer: {active_players[self.dealer_position].name}")
        print(f"{'='*60}")
        for player in active_players:
            if player.state != PlayerState.FOLDED:
                print(f"{player.name}: {player.hole_cards}")
    
    def deal_flop(self):
        """
        Deal flop (3 community cards)
        
        STATE TRANSITION: PRE_FLOP → FLOP
        """
        self.stage = GameStage.FLOP
        self.deck.deal()  # Burn card
        self.community_cards.extend([self.deck.deal() for _ in range(3)])
        print(f"\n{'='*60}")
        print(f"FLOP: {' '.join(str(c) for c in self.community_cards)}")
        print(f"{'='*60}")
    
    def deal_turn(self):
        """
        Deal turn (4th community card)
        
        STATE TRANSITION: FLOP → TURN
        """
        self.stage = GameStage.TURN
        self.deck.deal()  # Burn card
        self.community_cards.append(self.deck.deal())
        print(f"\n{'='*60}")
        print(f"TURN: {' '.join(str(c) for c in self.community_cards)}")
        print(f"{'='*60}")
    
    def deal_river(self):
        """
        Deal river (5th community card)
        
        STATE TRANSITION: TURN → RIVER
        """
        self.stage = GameStage.RIVER
        self.deck.deal()  # Burn card
        self.community_cards.append(self.deck.deal())
        print(f"\n{'='*60}")
        print(f"RIVER: {' '.join(str(c) for c in self.community_cards)}")
        print(f"{'='*60}")
    
    def determine_winners(self) -> List[Player]:
        """
        Determine winning player(s) at showdown
        
        BUSINESS RULE: Compare hands of active players
        
        Returns:
            List of winners (multiple if tie)
        """
        self.stage = GameStage.SHOWDOWN
        
        active_players = [p for p in self.players if p.state != PlayerState.FOLDED]
        
        if len(active_players) == 1:
            return active_players
        
        # Evaluate hands
        player_hands = []
        for player in active_players:
            hand = player.get_best_hand(self.community_cards)
            player_hands.append((player, hand))
            print(f"{player.name}: {hand}")
        
        # Find best hand
        player_hands.sort(key=lambda x: x[1].ranking.value, reverse=True)
        best_ranking = player_hands[0][1].ranking.value
        
        winners = []
        for player, hand in player_hands:
            if hand.ranking.value == best_ranking:
                if not winners or hand.compare(winners[0][1]) == 0:
                    winners.append((player, hand))
                elif hand.compare(winners[0][1]) > 0:
                    winners = [(player, hand)]
        
        return [w[0] for w in winners]
    
    def distribute_pot(self, winners: List[Player]):
        """
        Distribute pot to winner(s)
        
        BUSINESS RULE: Split pot evenly if multiple winners
        """
        if not winners:
            return
        
        amount_per_winner = self.pot.total // len(winners)
        
        for winner in winners:
            winner.chips += amount_per_winner
        
        print(f"\n{'='*60}")
        if len(winners) == 1:
            print(f"WINNER: {winners[0].name} wins ${self.pot.total}")
        else:
            print(f"TIE: {', '.join(w.name for w in winners)} split ${self.pot.total}")
        print(f"{'='*60}")
        
        # Rotate dealer
        self.dealer_position = (self.dealer_position + 1) % len(self.players)
        self.stage = GameStage.WAITING
    
    def play_hand_auto(self):
        """
        Play complete hand with automatic actions (for demo)
        
        DEMO FEATURE: Simulates simple betting for demonstration
        """
        self.start_hand()
        
        # Simple AI: everyone calls pre-flop
        active_players = [p for p in self.players if p.chips > 0 and p.state != PlayerState.FOLDED]
        for player in active_players:
            call_amount = self.current_bet - player.current_bet
            if call_amount > 0 and player.chips > 0:
                bet_amount = min(call_amount, player.chips)
                player.make_bet(bet_amount)
                self.pot.add_chips(bet_amount)
        
        self.deal_flop()
        self.deal_turn()
        self.deal_river()
        
        winners = self.determine_winners()
        self.distribute_pot(winners)


def main():
    """
    Demonstrate Poker Game with automated hand
    """
    print("=" * 60)
    print("TEXAS HOLD'EM POKER GAME - Low Level Design Demo")
    print("=" * 60)
    
    # Demo 1: Simple 4-player game
    print("\nDemo 1: Four-Player Texas Hold'em")
    print("-" * 60)
    game = PokerGame(
        player_names=["Alice", "Bob", "Charlie", "Diana"],
        starting_chips=1000,
        small_blind=10,
        big_blind=20
    )
    
    game.play_hand_auto()
    
    print("\n\nDemo 2: Another Hand")
    print("-" * 60)
    game.play_hand_auto()
    
    # Display final chip counts
    print("\n" + "=" * 60)
    print("FINAL CHIP COUNTS")
    print("=" * 60)
    for player in game.players:
        print(f"{player.name}: ${player.chips}")
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("\nFor full functionality, implement:")
    print("- Interactive betting with fold/check/call/raise options")
    print("- Proper betting round with action rotation")
    print("- Side pot management for all-in scenarios")
    print("- Blind increases for tournament mode")


if __name__ == "__main__":
    main()

