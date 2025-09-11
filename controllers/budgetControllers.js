import db from "../config/db.js";

// create new budget
export async function createBudget(req, res) {
 try {
  const {category_id, amount, period_start, period_end} = req.body;
  const userId = req.user.id
  // console.log(userId)
  if(!amount || !period_start || !period_end){
   return res.status(400).json({message : "amount, period_start, period_end fields are required"}); 
  }
  const result = await db.query(`
    INSERT INTO budgets
    (user_id, category_id, amount, period_start, period_end)
    VALUES($1, $2, $3, $4, $5) RETURNING *`,
   [userId, category_id || null, amount, period_start, period_end ]);

   return res.status(201).json({
    message : "Budget created sucessfully",
    budget : result.rows[0]
   });
 } catch (error) {
   console.error("Error creating budget", error);
   return res.status(500).json({message : "SERVER ERROR"});
 }
}
// Edit budget
export async function  editBudget(req, res){
  try {
    const {id} =req.params;
    const {amount, category_id, period_start, period_end} = req.body;
    const result = await db.query(`UPDATE budgets
SET amount = $1, category_id =$2,  period_start =$3, period_end =$4 
WHERE id =$5 AND user_id =$6 RETURNING *`,
[amount, category_id, period_start,period_end,id,req.user.id]);

    if (result.rows.length === 0) {
  return res.status(404).json({ message: "Budget not found or not authorized" });
}
    return res.status(200).json({
      message: "Budget updated sucessfully",
      budget: result.rows[0]
    })
  } catch (error) {
    console.error("Error updating budget", error);
    return res.status(500).json({message : "SERVER ERROR"});
  }
}
// get a single budget

export async function getBudgetById(req, res) {
  try {
    const {id} = req.params;
    const result = await db.query(`
      SELECT * FROM budgets WHERE id =$1 AND user_id = $2`, 
      [id, req.user.id]);
      if(result.rows.length === 0) return res.status(404).json({message : " Not found"});
      return res.json(result.rows[0])

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }  
}

// DELETE Budget

export async function deleteBudget(req,res) {
  try {
    const {id} = req.params;
    const budgetCheck = await db.query(`
      SELECT * FROM budgets WHERE id = $1 AND user_id = $2`,
    [id, req.user.id]);
    if(budgetCheck.rows.length === 0) return res.status(404).json({message : "Budget Not found or Action not authorized "});
    await db.query(`
      DELETE FROM budgets
      WHERE id =$1 AND user_id = $2`, [id, req.user.id])
    return res.status(200).json({message : " budget deleted successfully"})
  } catch (error) {
    console.error("Error deleting budget", error);
    return res.status(500).json({message: "Server Error"})
  }
}


// get all user budget
export async function getUserBudget(req, res) {
 try {
  const result =  await db.query(`
    SELECT b.*, c.name AS category_name
    FROM budgets b
    LEFT JOIN categories c
    ON b.category_id = c.id
    WHERE b.user_id =$1`,
    [req.user.id]
  );
  if(result.rows.length === 0){
   return res.status(400).json({message : "You don't have any budget"});
  }
  return res.status(200).json(result.rows)
 } catch (error) {
  console.error("Error getting budget", error);
  return res.status(500).json({message : "SERVER ERROR"})
 }
}


// Budget progress
export async function getBudgetProgress(req, res) {
const id = req.params.id;
  try {

    const budgetResult = await db.query(`
    SELECT b.*, c.name AS category_name
    FROM budgets b
    LEFT JOIN categories c
    ON b.category_id = c.id
    WHERE b.user_id = $1 AND b.id =$2  
  `, [req.user.id, id]);  
    if (budgetResult.rows.length === 0){
      return res.status(404).json({message : "Budget not Found or unauthorized"});
    }
    const budget = budgetResult.rows[0]
    let spentQuerry = `
        SELECT COALESCE(SUM(amount), 0) AS total_spent
        FROM transactions
        WHERE user_id = $1 AND type = 'expense'
        AND date BETWEEN $2 AND $3 `

      const values = [req.user.id, budget.period_start, budget.period_end];
      if(budget.category_id){
        spentQuerry += " AND category_id = $4";
        values.push(budget.category_id);        
      }
      const spentRes = await db.query(spentQuerry, values);
      const totalSpent = parseFloat(spentRes.rows[0].total_spent);
      const progress = {
        budget_id : budget.id,
        category : budget.category_name || "Overall",
        budget_amount : parseFloat(budget.amount),
        spent : totalSpent,
        remaining : parseFloat(budget.amount) - totalSpent,
        percent_used: ((totalSpent / budget.amount) * 100).toFixed(2),
        period : `${budget.period_start} to  ${budget.period_end}`
      }
      return res.status(200).json(progress);

  } catch (error) {
    console.error("Error fetching budget progress", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// Alerts
export async function getBudgetAlert(req, res) {

  try {
    const {id }= req.params;
    const budgetRes = await db.query(`
    SELECT * FROM budgets 
    WHERE user_id = $1 AND id = $2`
    ,[req.user.id, id]);

    if(budgetRes.rows.length === 0){
      return res.status(404).json({message : "Budget Not Found"});
    }

    const budget = budgetRes.rows[0];
    const spentres = await db.query(` 
        SELECT COALESCE(SUM(amount), 0) AS spent
        FROM transactions
        WHERE user_id =$1 AND category_id = $2 
        AND date BETWEEN $3 AND $4 `,
      [req.user.id,budget.category_id, budget.period_start, budget.period_end ]
      );
      // console.log("I have succesfully qurried spentres")

      const spent = parseFloat(spentres.rows[0].spent) || 0;
      const percent = (spent/ budget.amount) * 100;

      // Alert Logic
      let status = "ok";
      let message = "Within budget";

      if(spent > budget.amount){
        status = "Overspent"
        message = `You have overspent your budget of ${budget.amount}. Spent ${spent}`
      }
      else if(percent >= 80){
        status ="Nearing Limit";
        message = `Warning: You’ve used ${percentage.toFixed(1)}% of your budget`;
      }
       return res.json({budget, spent, status,message});

  } catch (error) {
    console.error("Error checking budget alert:", error);
    return res.status(500).json({ message: "Server error" });
  }  
}

export async function getAllBudgetAlerts(req, res) {
  try {
    const result = await db.query(`
SELECT 
b.id AS budget_id,
b.category_id AS category_id,
c.name AS category_name,
b.amount AS limit_amount,
b.period_start,
b.period_end,
COALESCE(SUM(t.amount), 0) AS spent,
CASE
	WHEN(COALESCE(SUM(t.amount), 0)) > b.amount THEN 'Exceeded'
	ELSE 'OK' 
	END AS status
FROM budgets b
JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t
ON t.category_id = b.category_id
AND t.date BETWEEN b.period_start AND period_end
AND t.user_id = b.user_id
WHERE b.user_id = $1
GROUP BY b.id, c.name`,[ req.user.id]);

return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching budget alerts:", error);
    return res.status(500).json({ message: "Server error" });
  }
  
}