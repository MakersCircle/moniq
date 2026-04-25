# Use Cases & Workflows

This document describes how to handle common financial scenarios in Moniq.

## 1. Tracking a Lent Amount
**Scenario**: You lent $50 to a friend.
1. Create a Category named **"Lending/Borrowing"** if it doesn't exist.
2. Add a **New Transaction**.
3. Type: **Expense**.
4. Category: **Lending/Borrowing**.
5. Note: *"Lent $50 to John"*.
6. Result: Your account balance decreases, and the Dashboard "Lent" stat increases.

## 2. Receiving a Loan Repayment
**Scenario**: John pays you back the $50.
1. Add a **New Transaction**.
2. Type: **Income**.
3. Category: **Lending/Borrowing**.
4. Note: *"Repayment from John"*.
5. Result: Your account balance increases, and the "Lent" stat returns to zero.

## 3. Handling Credit Card Payments
**Scenario**: You pay your Credit Card bill from your Savings Account.
1. Use the **Transfer** type.
2. From: **Savings Account**.
3. To: **Credit Card Account**.
4. Result: Money moves between accounts without affecting your Income or Expense stats (since the expense was already tracked when you used the card).

## 4. Multi-Currency Travel
**Scenario**: You are traveling and spending in EUR while your home currency is USD.
1. Moniq tracks your total Net Worth in your **Home Currency** (set in Settings).
2. It is recommended to enter the converted amount in your home currency in the "Amount" field.
3. Use the **Note** or **Tags** to record the original EUR amount for your records.

## 5. Shared Expenses (Split)
**Scenario**: You paid $100 for dinner, but your friend owes you $50.
1. Add an **Expense** for $100.
2. Category: **Food & Dining**.
3. Note: *"Dinner with Alex (Alex owes $50)"*.
4. *Coming Soon*: Use the **Split Transaction** feature to allocate $50 to "Food" and $50 to "Lent".

---
**Have a complex scenario?** Let us know and we'll add it here.
