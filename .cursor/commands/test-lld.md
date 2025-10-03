**Description**: Generate test cases for an LLD problem

**Usage**: `/test-lld <system-name>`

**AI Instructions**:
When this command is invoked:
1. Create `python/<system-name>/test_main.py` with pytest test cases
2. Create `javascript/<system-name>/test.js` with jest test cases
3. Cover:
   - Happy path scenarios
   - Edge cases
   - Error conditions
   - Business rule validations

---