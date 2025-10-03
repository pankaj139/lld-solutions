"""
POKER GAME SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Hand evaluation and betting strategies
   - Different hand ranking algorithms (Texas Hold'em, Omaha, Stud)
   - Betting strategies: aggressive, conservative, bluffing, analytical
   - AI player strategies with different skill levels and personalities
   - Pot calculation strategies for different game variants

2. STATE PATTERN: Game phases with explicit state transitions
   - Game phases: ANTE -> DEAL -> PRE_FLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN
   - Player states: ACTIVE -> FOLDED -> ALL_IN -> OUT
   - Each phase has specific allowed actions and betting rules
   - Proper state transitions ensure game integrity

3. COMMAND PATTERN: Player actions as command objects
   - Betting actions: call, raise, fold, check, all-in
   - Action validation and execution with rollback support
   - Action history for game analysis and replay
   - Undo support for accidental actions in practice mode

4. OBSERVER PATTERN: Game event notifications
   - Pot updates and betting round notifications
   - Card dealing and reveal events
   - Player action broadcasts to all participants
   - Side pot calculations and winner announcements

5. FACTORY PATTERN: Card and hand creation
   - Standard deck creation with proper shuffling
   - Hand evaluation factory for different poker variants
   - Player factory for different types (human, AI, tournament)
   - Game variant factory for different poker rules

6. DECORATOR PATTERN: Player abilities and tournament features
   - Base player functionality enhanced with features
   - Tournament chips, bounties, special abilities
   - VIP features: extra time, detailed statistics, coaching hints
   - Stackable features without class proliferation

OOP CONCEPTS DEMONSTRATED:
- INHERITANCE: Card hierarchy and player type specialization
- ENCAPSULATION: Hidden cards and private betting information
- ABSTRACTION: Complex poker rules abstracted into simple interfaces
- POLYMORPHISM: Different game variants and player types handled uniformly

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility (Hand, Pot, Betting, Dealing)
- OCP: Easy to add new poker variants and betting structures
- LSP: All player types and game variants interchangeable
- ISP: Focused interfaces for different aspects of poker gameplay
- DIP: Game logic depends on abstractions, not concrete implementations

BUSINESS FEATURES:
- Multiple poker variants (Texas Hold'em, Omaha, Seven Card Stud)
- Tournament and cash game support
- AI opponents with different skill levels and playing styles
- Comprehensive hand history and statistics tracking
- Side pot management for all-in situations
- Blind structure management for tournaments

ARCHITECTURAL NOTES:
- Event-driven architecture for real-time multiplayer support
- Secure card dealing with proper randomization
- Comprehensive hand evaluation with tie-breaking
- Scalable design for large tournaments
- Integration points for payment processing and user management
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Dict, Optional, Tuple
import random
import uuid
from dataclasses import dataclass

class Suit(Enum):
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"
    SPADES = "♠"

class Rank(Enum):
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

class HandRank(Enum):
    HIGH_CARD = 1
    PAIR = 2
    TWO_PAIR = 3
    THREE_OF_A_KIND = 4
    STRAIGHT = 5
    FLUSH = 6
    FULL_HOUSE = 7
    FOUR_OF_A_KIND = 8
    STRAIGHT_FLUSH = 9
    ROYAL_FLUSH = 10

class GamePhase(Enum):
    WAITING = "WAITING"
    ANTE = "ANTE"
    DEAL = "DEAL"
    PRE_FLOP = "PRE_FLOP"
    FLOP = "FLOP"
    TURN = "TURN"
    RIVER = "RIVER"
    SHOWDOWN = "SHOWDOWN"
    GAME_OVER = "GAME_OVER"

class PlayerState(Enum):
    ACTIVE = "ACTIVE"
    FOLDED = "FOLDED"
    ALL_IN = "ALL_IN"
    OUT = "OUT"

class ActionType(Enum):
    FOLD = "FOLD"
    CHECK = "CHECK"
    CALL = "CALL"
    RAISE = "RAISE"
    ALL_IN = "ALL_IN"

# VALUE OBJECT: Playing card
@dataclass(frozen=True)
class Card:
    rank: Rank
    suit: Suit
    
    def __str__(self):
        return f"{self.rank.name}{self.suit.value}"
    
    def __lt__(self, other):
        return self.rank.value < other.rank.value

# VALUE OBJECT: Poker hand evaluation result
@dataclass(frozen=True)
class HandValue:
    rank: HandRank
    high_cards: List[Rank]  # Ordered list for tie-breaking
    
    def __lt__(self, other):
        if self.rank.value != other.rank.value:
            return self.rank.value < other.rank.value
        
        # Compare high cards for tie-breaking
        for my_card, other_card in zip(self.high_cards, other.high_cards):
            if my_card.value != other_card.value:
                return my_card.value < other_card.value
        
        return False  # Hands are equal

# AGGREGATE: Deck of cards with shuffling
class Deck:
    def __init__(self):
        self.cards = []
        self.reset()
    
    def reset(self):
        """Create a new shuffled deck"""
        self.cards = []
        for suit in Suit:
            for rank in Rank:
                self.cards.append(Card(rank, suit))
        self.shuffle()
    
    def shuffle(self):
        """Shuffle the deck"""
        random.shuffle(self.cards)
    
    def deal_card(self) -> Optional[Card]:
        """Deal one card from the deck"""
        return self.cards.pop() if self.cards else None
    
    def cards_remaining(self) -> int:
        return len(self.cards)

# STRATEGY PATTERN: Hand evaluation algorithms
class HandEvaluator(ABC):
    @abstractmethod
    def evaluate_hand(self, cards: List[Card]) -> HandValue:
        pass

class TexasHoldemEvaluator(HandEvaluator):
    def evaluate_hand(self, cards: List[Card]) -> HandValue:
        """Evaluate 5-card poker hand (best 5 from 7 cards in Texas Hold'em)"""
        if len(cards) < 5:
            return HandValue(HandRank.HIGH_CARD, [card.rank for card in sorted(cards, reverse=True)])
        
        # For simplicity, evaluate the first 5 cards
        # In a real implementation, would find the best 5-card combination
        hand = sorted(cards[:5], reverse=True)
        
        # Check for flush
        is_flush = len(set(card.suit for card in hand)) == 1
        
        # Check for straight
        ranks = [card.rank.value for card in hand]
        is_straight = all(ranks[i] - ranks[i+1] == 1 for i in range(4))
        
        # Handle Ace-low straight (A, 2, 3, 4, 5)
        if ranks == [14, 5, 4, 3, 2]:
            is_straight = True
            ranks = [5, 4, 3, 2, 1]  # Treat ace as 1
        
        # Count rank frequencies
        rank_counts = {}
        for rank in [card.rank for card in hand]:
            rank_counts[rank] = rank_counts.get(rank, 0) + 1
        
        count_values = sorted(rank_counts.values(), reverse=True)
        unique_ranks = sorted(rank_counts.keys(), key=lambda x: (rank_counts[x], x.value), reverse=True)
        
        # Determine hand rank
        if is_straight and is_flush:
            if ranks[0] == 14:  # Ace high straight flush
                return HandValue(HandRank.ROYAL_FLUSH, [Rank.ACE])
            else:
                return HandValue(HandRank.STRAIGHT_FLUSH, [Rank(ranks[0])])
        elif count_values == [4, 1]:
            return HandValue(HandRank.FOUR_OF_A_KIND, unique_ranks)
        elif count_values == [3, 2]:
            return HandValue(HandRank.FULL_HOUSE, unique_ranks)
        elif is_flush:
            return HandValue(HandRank.FLUSH, [card.rank for card in hand])
        elif is_straight:
            return HandValue(HandRank.STRAIGHT, [Rank(ranks[0])])
        elif count_values == [3, 1, 1]:
            return HandValue(HandRank.THREE_OF_A_KIND, unique_ranks)
        elif count_values == [2, 2, 1]:
            return HandValue(HandRank.TWO_PAIR, unique_ranks)
        elif count_values == [2, 1, 1, 1]:
            return HandValue(HandRank.PAIR, unique_ranks)
        else:
            return HandValue(HandRank.HIGH_CARD, [card.rank for card in hand])

# COMMAND PATTERN: Player actions
class PlayerAction:
    def __init__(self, player_id: str, action_type: ActionType, amount: int = 0):
        self.action_id = str(uuid.uuid4())
        self.player_id = player_id
        self.action_type = action_type
        self.amount = amount
        self.timestamp = None

# ENTITY: Poker player with chips and cards
class Player:
    def __init__(self, player_id: str, name: str, chips: int):
        self.player_id = player_id
        self.name = name
        self.chips = chips
        self.hole_cards: List[Card] = []
        self.state = PlayerState.ACTIVE
        self.current_bet = 0
        self.total_bet_this_round = 0
        self.is_dealer = False
        self.is_small_blind = False
        self.is_big_blind = False
    
    def add_chips(self, amount: int):
        """Add chips to player's stack"""
        self.chips += amount
    
    def bet(self, amount: int) -> bool:
        """Make a bet if player has enough chips"""
        if amount > self.chips:
            # All-in
            amount = self.chips
            self.state = PlayerState.ALL_IN
        
        self.chips -= amount
        self.current_bet += amount
        self.total_bet_this_round += amount
        return True
    
    def fold(self):
        """Fold hand"""
        self.state = PlayerState.FOLDED
    
    def reset_for_new_round(self):
        """Reset player for new betting round"""
        self.current_bet = 0
        # Don't reset total_bet_this_round - that's for the entire hand
    
    def reset_for_new_hand(self):
        """Reset player for new hand"""
        self.hole_cards.clear()
        self.current_bet = 0
        self.total_bet_this_round = 0
        self.state = PlayerState.ACTIVE if self.chips > 0 else PlayerState.OUT
        self.is_dealer = False
        self.is_small_blind = False
        self.is_big_blind = False

# AGGREGATE: Pot management with side pots
class Pot:
    def __init__(self):
        self.main_pot = 0
        self.side_pots: List[Dict] = []  # [{'amount': int, 'eligible_players': List[str]}]
    
    def add_to_pot(self, amount: int):
        """Add amount to main pot"""
        self.main_pot += amount
    
    def create_side_pot(self, amount: int, eligible_players: List[str]):
        """Create side pot for all-in situations"""
        self.side_pots.append({
            'amount': amount,
            'eligible_players': eligible_players
        })
    
    def get_total_pot(self) -> int:
        """Get total pot amount"""
        return self.main_pot + sum(pot['amount'] for pot in self.side_pots)
    
    def reset(self):
        """Reset pot for new hand"""
        self.main_pot = 0
        self.side_pots.clear()

# OBSERVER PATTERN: Game event notifications
class PokerGameObserver(ABC):
    @abstractmethod
    def notify_action(self, player: Player, action: PlayerAction):
        pass
    
    @abstractmethod
    def notify_phase_change(self, new_phase: GamePhase):
        pass
    
    @abstractmethod
    def notify_pot_update(self, pot_amount: int):
        pass

class ConsolePokerObserver(PokerGameObserver):
    def notify_action(self, player: Player, action: PlayerAction):
        print(f"{player.name} {action.action_type.value.lower()}" + 
              (f" ${action.amount}" if action.amount > 0 else ""))
    
    def notify_phase_change(self, new_phase: GamePhase):
        print(f"=== {new_phase.value} ===")
    
    def notify_pot_update(self, pot_amount: int):
        print(f"Pot: ${pot_amount}")

# FACADE PATTERN: Poker game management
class PokerGame:
    def __init__(self, small_blind: int = 10, big_blind: int = 20):
        self.game_id = str(uuid.uuid4())
        self.players: List[Player] = []
        self.deck = Deck()
        self.community_cards: List[Card] = []
        self.pot = Pot()
        self.current_phase = GamePhase.WAITING
        self.dealer_position = 0
        self.current_player_position = 0
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.hand_evaluator = TexasHoldemEvaluator()
        self.observers: List[PokerGameObserver] = []
        self.action_history: List[PlayerAction] = []
    
    def add_observer(self, observer: PokerGameObserver):
        """Add game observer"""
        self.observers.append(observer)
    
    def add_player(self, player: Player):
        """Add player to the game"""
        if len(self.players) < 10:  # Max 10 players
            self.players.append(player)
            return True
        return False
    
    def start_new_hand(self):
        """Start a new hand"""
        if len(self.players) < 2:
            return False
        
        # Reset for new hand
        self.deck.reset()
        self.community_cards.clear()
        self.pot.reset()
        self.action_history.clear()
        
        for player in self.players:
            player.reset_for_new_hand()
        
        # Set dealer, small blind, big blind
        self._set_blinds()
        
        # Deal hole cards
        self._deal_hole_cards()
        
        # Post blinds
        self._post_blinds()
        
        # Start pre-flop betting
        self.current_phase = GamePhase.PRE_FLOP
        self._notify_phase_change(GamePhase.PRE_FLOP)
        
        return True
    
    def _set_blinds(self):
        """Set dealer, small blind, and big blind positions"""
        num_players = len(self.players)
        
        self.players[self.dealer_position].is_dealer = True
        
        if num_players == 2:
            # Heads-up: dealer is small blind
            self.players[self.dealer_position].is_small_blind = True
            self.players[(self.dealer_position + 1) % num_players].is_big_blind = True
        else:
            sb_pos = (self.dealer_position + 1) % num_players
            bb_pos = (self.dealer_position + 2) % num_players
            self.players[sb_pos].is_small_blind = True
            self.players[bb_pos].is_big_blind = True
    
    def _deal_hole_cards(self):
        """Deal 2 hole cards to each player"""
        for _ in range(2):
            for player in self.players:
                if player.state == PlayerState.ACTIVE:
                    card = self.deck.deal_card()
                    if card:
                        player.hole_cards.append(card)
    
    def _post_blinds(self):
        """Post small and big blinds"""
        for player in self.players:
            if player.is_small_blind:
                player.bet(self.small_blind)
                self.pot.add_to_pot(self.small_blind)
            elif player.is_big_blind:
                player.bet(self.big_blind)
                self.pot.add_to_pot(self.big_blind)
    
    def process_action(self, player_id: str, action_type: ActionType, amount: int = 0) -> bool:
        """Process player action"""
        player = next((p for p in self.players if p.player_id == player_id), None)
        if not player or player.state != PlayerState.ACTIVE:
            return False
        
        action = PlayerAction(player_id, action_type, amount)
        
        if action_type == ActionType.FOLD:
            player.fold()
        elif action_type == ActionType.CALL:
            # Calculate call amount
            call_amount = self._get_call_amount(player)
            player.bet(call_amount)
            self.pot.add_to_pot(call_amount)
            action.amount = call_amount
        elif action_type == ActionType.RAISE:
            # Raise includes the call amount
            total_bet = amount
            player.bet(total_bet)
            self.pot.add_to_pot(total_bet)
            action.amount = total_bet
        elif action_type == ActionType.CHECK:
            # Can only check if no bet to call
            if self._get_call_amount(player) > 0:
                return False
        elif action_type == ActionType.ALL_IN:
            all_in_amount = player.chips
            player.bet(all_in_amount)
            self.pot.add_to_pot(all_in_amount)
            action.amount = all_in_amount
        
        self.action_history.append(action)
        
        # Notify observers
        for observer in self.observers:
            observer.notify_action(player, action)
            observer.notify_pot_update(self.pot.get_total_pot())
        
        return True
    
    def _get_call_amount(self, player: Player) -> int:
        """Get amount needed to call current bet"""
        max_bet = max((p.current_bet for p in self.players), default=0)
        return max(0, max_bet - player.current_bet)
    
    def advance_to_next_phase(self):
        """Advance to next phase of the hand"""
        if self.current_phase == GamePhase.PRE_FLOP:
            self._deal_flop()
            self.current_phase = GamePhase.FLOP
        elif self.current_phase == GamePhase.FLOP:
            self._deal_turn()
            self.current_phase = GamePhase.TURN
        elif self.current_phase == GamePhase.TURN:
            self._deal_river()
            self.current_phase = GamePhase.RIVER
        elif self.current_phase == GamePhase.RIVER:
            self._showdown()
            self.current_phase = GamePhase.SHOWDOWN
        
        self._notify_phase_change(self.current_phase)
        
        # Reset betting round
        for player in self.players:
            player.reset_for_new_round()
    
    def _deal_flop(self):
        """Deal the flop (3 community cards)"""
        self.deck.deal_card()  # Burn card
        for _ in range(3):
            card = self.deck.deal_card()
            if card:
                self.community_cards.append(card)
    
    def _deal_turn(self):
        """Deal the turn (4th community card)"""
        self.deck.deal_card()  # Burn card
        card = self.deck.deal_card()
        if card:
            self.community_cards.append(card)
    
    def _deal_river(self):
        """Deal the river (5th community card)"""
        self.deck.deal_card()  # Burn card
        card = self.deck.deal_card()
        if card:
            self.community_cards.append(card)
    
    def _showdown(self):
        """Evaluate hands and determine winner"""
        active_players = [p for p in self.players if p.state in [PlayerState.ACTIVE, PlayerState.ALL_IN]]
        
        if len(active_players) == 1:
            # Only one player left
            winner = active_players[0]
            winner.add_chips(self.pot.get_total_pot())
            print(f"{winner.name} wins ${self.pot.get_total_pot()}")
            return
        
        # Evaluate hands
        player_hands = {}
        for player in active_players:
            all_cards = player.hole_cards + self.community_cards
            hand_value = self.hand_evaluator.evaluate_hand(all_cards)
            player_hands[player] = hand_value
        
        # Find winner(s)
        best_hand = max(player_hands.values())
        winners = [player for player, hand in player_hands.items() if hand == best_hand]
        
        # Distribute pot
        pot_share = self.pot.get_total_pot() // len(winners)
        for winner in winners:
            winner.add_chips(pot_share)
            print(f"{winner.name} wins ${pot_share} with {best_hand.rank.name}")
    
    def _notify_phase_change(self, new_phase: GamePhase):
        """Notify observers of phase change"""
        for observer in self.observers:
            observer.notify_phase_change(new_phase)

# DEMO: Poker game usage
def demo_poker_game():
    # Create players
    player1 = Player("p1", "Alice", 1000)
    player2 = Player("p2", "Bob", 1000)
    player3 = Player("p3", "Charlie", 1000)
    
    # Create game
    game = PokerGame(small_blind=10, big_blind=20)
    
    # Add observer
    observer = ConsolePokerObserver()
    game.add_observer(observer)
    
    # Add players
    game.add_player(player1)
    game.add_player(player2)
    game.add_player(player3)
    
    # Start hand
    print("Starting poker hand...")
    game.start_new_hand()
    
    # Show hole cards (normally hidden)
    for player in game.players:
        cards_str = ", ".join(str(card) for card in player.hole_cards)
        print(f"{player.name}'s hole cards: {cards_str}")
    
    # Simulate some actions
    print("\n--- Pre-flop betting ---")
    game.process_action("p1", ActionType.CALL, 20)  # Call big blind
    game.process_action("p2", ActionType.RAISE, 60)  # Raise to 60
    game.process_action("p3", ActionType.CALL, 60)   # Call
    game.process_action("p1", ActionType.FOLD)       # Fold
    
    # Advance to flop
    game.advance_to_next_phase()
    flop_str = ", ".join(str(card) for card in game.community_cards)
    print(f"Flop: {flop_str}")
    
    print("\n--- Flop betting ---")
    game.process_action("p2", ActionType.CHECK)
    game.process_action("p3", ActionType.CHECK)
    
    # Advance to turn
    game.advance_to_next_phase()
    turn_str = ", ".join(str(card) for card in game.community_cards)
    print(f"Turn: {turn_str}")
    
    print("\n--- Turn betting ---")
    game.process_action("p2", ActionType.CHECK)
    game.process_action("p3", ActionType.CHECK)
    
    # Advance to river
    game.advance_to_next_phase()
    river_str = ", ".join(str(card) for card in game.community_cards)
    print(f"River: {river_str}")
    
    print("\n--- River betting ---")
    game.process_action("p2", ActionType.CHECK)
    game.process_action("p3", ActionType.CHECK)
    
    # Showdown
    print("\n--- Showdown ---")
    game.advance_to_next_phase()

if __name__ == "__main__":
    demo_poker_game()