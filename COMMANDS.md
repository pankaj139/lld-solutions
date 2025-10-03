# Custom Cursor Commands for LLD Solutions

This document explains how to use the custom slash commands available in this workspace.

## Quick Reference

| Command | Purpose | Usage |
|---------|---------|-------|
| `/create-lld` | Create a new LLD problem | `/create-lld <name> <category> <difficulty>` |
| `/analyze-lld` | Analyze existing problem | `/analyze-lld <name>` |
| `/extend-lld` | Add new features | `/extend-lld <name> <feature>` |
| `/test-lld` | Generate test cases | `/test-lld <name>` |
| `/compare-lld` | Compare two problems | `/compare-lld <name1> <name2>` |

## Detailed Usage

### 1. `/create-lld` - Create New LLD Problem

**Purpose**: Automatically generates a complete LLD problem with documentation and implementations.

**Syntax**:

```bash
/create-lld <system-name> <category> <difficulty>
```

**Parameters**:

- `system-name`: Kebab-case name (e.g., `streaming-service`, `cloud-storage`, `api-gateway`)
- `category`: Choose one of:
  - `system-design` - Infrastructure and service systems
  - `game-design` - Game mechanics and rules
  - `business-system` - Business domain models
  - `data-structure` - Cache, queue, graph systems
- `difficulty`: Choose one of:
  - `easy` - Basic patterns, 3-5 classes
  - `medium` - Multiple patterns, 5-8 classes
  - `hard` - Complex interactions, 8+ classes

**Examples**:

```bash
# Create a streaming service system
/create-lld streaming-service system-design hard

# Create a simple calculator
/create-lld calculator data-structure easy

# Create a trading card game
/create-lld trading-card-game game-design medium
```

**What Gets Created**:

1. ✅ `<system-name>.md` - Complete documentation
2. ✅ `python/<system-name>/main.py` - Python implementation
3. ✅ `javascript/<system-name>/main.js` - JavaScript implementation
4. ✅ Updated `README.md` with new entry

**Interactive Workflow**:

After running the command, the AI will ask you:

1. Core capabilities (5-6 features)
2. Key functional requirements
3. Non-functional requirements
4. Specific design patterns you want to use (or it will suggest)

---

### 2. `/analyze-lld` - Analyze Existing Problem

**Purpose**: Get improvement suggestions for an existing LLD problem.

**Syntax**:

```bash
/analyze-lld <system-name>
```

**Examples**:

```bash
/analyze-lld atm-system
/analyze-lld parking-lot-system
```

**Analysis Includes**:

- ✅ Design pattern opportunities
- ✅ Code quality issues
- ✅ Missing edge cases
- ✅ Documentation completeness
- ✅ Markdownlint compliance
- ✅ Performance improvements
- ✅ SOLID principle violations

---

### 3. `/extend-lld` - Add New Features

**Purpose**: Add new features to an existing system while maintaining consistency.

**Syntax**:

```bash
/extend-lld <system-name> <feature-description>
```

**Examples**:

```bash
# Add biometric authentication to ATM
/extend-lld atm-system add fingerprint authentication

# Add video call feature to chat
/extend-lld chat-application add video calling support

# Add loyalty points to food delivery
/extend-lld food-delivery-system add loyalty rewards program
```

**What Gets Updated**:

1. ✅ Updated markdown documentation with new features
2. ✅ Updated Python implementation
3. ✅ Updated JavaScript implementation
4. ✅ New usage examples in demo code

---

### 4. `/test-lld` - Generate Test Cases

**Purpose**: Create comprehensive test suites for existing implementations.

**Syntax**:

```bash
/test-lld <system-name>
```

**Examples**:

```bash
/test-lld atm-system
/test-lld parking-lot-system
```

**What Gets Created**:

1. ✅ `python/<system-name>/test_main.py` - pytest test suite
2. ✅ `javascript/<system-name>/test.js` - jest test suite

**Test Coverage Includes**:

- Happy path scenarios
- Edge cases
- Error conditions
- Business rule validations
- Concurrent operations (if applicable)
- State transitions

**Running Tests**:

```bash
# Python tests
cd python/<system-name>
pytest test_main.py -v

# JavaScript tests
cd javascript/<system-name>
npm test
```

---

### 5. `/compare-lld` - Compare Two Problems

**Purpose**: Identify pattern differences and get cross-learning insights.

**Syntax**:

```bash
/compare-lld <system-name-1> <system-name-2>
```

**Examples**:

```bash
/compare-lld atm-system parking-lot-system
/compare-lld chess-game poker-game
/compare-lld lru-cache-system rate-limiter-system
```

**Comparison Output**:

- Common design patterns
- Unique patterns in each system
- Class structure differences
- State management approaches
- Suggested improvements
- Pattern recommendations

---

## Best Practices

### When Creating New Problems

1. **Start with clear requirements**: Think about the core features before running `/create-lld`
2. **Choose appropriate category**: This affects the patterns and structure used
3. **Set realistic difficulty**:
   - Easy: 3-5 classes, 2-3 patterns
   - Medium: 5-8 classes, 3-4 patterns
   - Hard: 8+ classes, 5+ patterns

### Problem Naming Conventions

Use kebab-case (lowercase with hyphens):

```text
✅ streaming-service
✅ cloud-storage-system
✅ api-gateway
✅ distributed-database

❌ StreamingService
❌ cloud_storage
❌ API-Gateway
```

### After Creating a Problem

1. **Review the generated code**: Ensure it matches your requirements
2. **Run the demo**: Test both Python and JavaScript implementations
3. **Check markdown**: Ensure no linting errors
4. **Add to git**: Commit the new files

```bash
# Run Python demo
python python/<system-name>/main.py

# Run JavaScript demo
node javascript/<system-name>/main.js

# Check markdown linting
# (should be clean if generated by the command)

# Commit changes
git add .
git commit -m "Add <system-name> LLD problem"
```

---

## Command Workflow Examples

### Example 1: Creating a Complete New System

```bash
# Step 1: Create the system
/create-lld cloud-storage-system system-design hard

# AI will generate all files...

# Step 2: Review and test
python python/cloud-storage-system/main.py
node javascript/cloud-storage-system/main.js

# Step 3: Generate tests
/test-lld cloud-storage-system

# Step 4: Run tests
cd python/cloud-storage-system && pytest test_main.py
```

### Example 2: Improving an Existing System

```bash
# Step 1: Analyze current implementation
/analyze-lld atm-system

# AI provides suggestions...

# Step 2: Extend with new feature
/extend-lld atm-system add contactless card support

# AI updates all files...

# Step 3: Regenerate tests with new features
/test-lld atm-system
```

### Example 3: Learning from Existing Systems

```bash
# Compare similar systems to learn patterns
/compare-lld hotel-booking-system movie-ticket-booking

# AI shows pattern differences and commonalities...

# Create a new system using learned patterns
/create-lld concert-ticket-booking system-design medium
```

---

## Troubleshooting

### Issue: Command not recognized

**Solution**: Ensure `.cursorrules` file exists in the workspace root.

### Issue: Generated code doesn't run

**Solution**: Check dependencies:

```bash
# Python
python --version  # Should be 3.7+

# JavaScript
node --version    # Should be 14+
```

### Issue: Markdown linting errors

**Solution**: The AI should generate lint-free markdown. If errors occur:

1. Check code blocks have language tags
2. Use headings (####) not bold for sections
3. Ensure blank lines around blocks

### Issue: Want to customize templates

**Solution**: Edit `.cursorrules` file to modify the templates in the "AI Instructions" sections.

---

## Advanced Usage

### Creating Problem Variants

```bash
# Create base system
/create-lld payment-system business-system medium

# Create variants for different payment providers
/extend-lld payment-system add stripe integration
/extend-lld payment-system add paypal integration
/extend-lld payment-system add cryptocurrency support
```

### Batch Analysis

```bash
# Analyze all game systems
/analyze-lld chess-game
/analyze-lld poker-game
/analyze-lld sudoku-game
# ... review suggestions and apply improvements
```

### Pattern Learning Path

```bash
# Learn State pattern
/compare-lld atm-system elevator-system

# Learn Strategy pattern  
/compare-lld parking-lot-system food-delivery-system

# Learn Observer pattern
/compare-lld chat-application notification-system
```

---

## Contributing

When contributing new systems, use the commands to ensure consistency:

1. Use `/create-lld` for structure
2. Use `/test-lld` for test coverage
3. Use `/analyze-lld` before submitting
4. Follow the generated structure exactly

---

## Quick Tips

💡 **Tip 1**: Always specify difficulty to get appropriate complexity

💡 **Tip 2**: Use descriptive system names (e.g., `real-time-collaboration-system` not `rtcs`)

💡 **Tip 3**: Run `/analyze-lld` periodically to catch improvements

💡 **Tip 4**: Use `/compare-lld` to learn pattern applications

💡 **Tip 5**: Generate tests immediately after creating new systems

---

**Need Help?** Check the [LLD Framework](./docs/lld-framework.md) for systematic approach to designing systems.

**Want to customize?** Edit [.cursorrules](./.cursorrules) to modify command behavior and templates.
