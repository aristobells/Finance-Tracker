import db from "../config/db.js";
import {Parser} from "json2csv"
import PDFDocument from "pdfkit";

// Add transactions Controllers
export async function addTransaction(req, res){
 try {

  const {amount,type, category_id, description, date} = req.body;
  if(!amount || !type || !date){ 
   return res.status(400).json({message : "Amont, type and date are required"});
  }
  else{
   const result = await db.query("INSERT INTO transactions (user_id, amount, type, category_id, description, date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [req.user.id, amount, type,category_id, description, date]);
   return res.status(201).json({message:"Transaction created successfully", transaction : result.rows[0]});
  }
  
 } catch (error) {
  console.error("Error adding transaction", error);
  return res.status(500).json({message: "Server error"});
 }
}

// fetch all transactions belonging to the logged-in user.
export async function getAllUserTransactions(req, res) {
 try {

  const result = await db.query(`SELECT t.*,c.name AS category_name
FROM transactions t
LEFT JOIN categories c
ON t.category_id = c.id
WHERE t.user_id = $1
ORDER BY t.date DESC;`, [req.user.id])
  // console.log(result.rows)
  return res.status(200).json(result.rows)
  
 } catch (error) {
  console.error("Error Fetching User transactions", error)
  return res.status(500).json({message: "Server Error"})

 }
}

// delete a specific transaction (only if it belongs to the logged-in user).

export async function deleteTransaction(req,res) {
 try {
  const {id} = req.params;
  console.log(id)
  const check = await db.query("SELECT * FROM transactions WHERE id = $1 AND user_id = $2 "
   , [id, req.user.id]);

   if(check.rows.length === 0){
    return res.status(404).json({message : "Transaction not found or Action not authorized"});
   }
   else{
    await db.query("DELETE  FROM transactions WHERE id = $1",[id]);
    return res.status(200).json({message: "Transaction deleted sucessfully"})
   }
  
 } catch (error) {
  console.error("Error deleting Transaction", error);
  return res.status(500).json({message: "Server Error"});
 } 
 
}

// Get a single transaction
export async function getTransactionById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ msg: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
}
// Edit Transaction

export async function editTransaction(req, res) {
  try {
    const { id } = req.params;
    const { amount, type, category_id, description, date } = req.body;

    const tranRes = await db.query(`
      UPDATE transactions
      SET amount = $1, type = $2, category_id = $3, description = $4, date = $5
      WHERE user_id = $6 AND id = $7
      RETURNING *;
    `, [amount, type, category_id, description, date, req.user.id, id]);
    

    if (tranRes.rows.length === 0) {
      console.log(req.params)
      return res.status(403).json({ error: "Not authorized to update this transaction" });
    }

    res.json(tranRes.rows[0]); // send updated transaction
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
}


// Filter transaction

export async function filterTransaction(req, res) {

  try {
    const {startDate, endDate, type, category_id, sort, page=1, limit=10 } = req.query;
    let query = "SELECT t.*, c.name AS category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1";
    let params = [req.user.id];
    let paramIndex = 2;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit,10);
    const offset = (pageNum - 1) * limitNum
    // filter by date
    if(startDate){
      query += ` AND t.date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++;
    }
    if(endDate){
      query += ` AND t.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    // filter by type
    if(type){
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    // filter by category
    if(category_id){
      query += ` AND t.category_id = $${paramIndex}`;
      params.push(category_id)
      paramIndex++;
    }

    // sort by

    if(sort){
      if(sort === "date_asc"){
        query += " ORDER BY date ASC";
      }
      else if(sort === "date_desc"){
        query += " ORDER BY date DESC";
      }
      else if( sort === "amount_asc"){
        query += " ORDER BY amount ASC";
      }
      else if( sort === "amount_desc"){
        query += " ORDER BY amount DESC";
      }
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limitNum, offset)
    const result = await db.query(query, params);
    // return res.status(200).json(result.rows)
    // Count total records for pagination info
     let countQuery = "SELECT COUNT(*) FROM transactions t WHERE user_id =$1";
     let countParams = [req.user.id];
     let countIndex = 2;

     if(startDate){
      countQuery += ` AND t.date >= $${countIndex}`;
      countParams.push(startDate);
      countIndex++;      
     }

     if(endDate){
      countQuery += ` AND t.date <= $${countIndex}`;
      countParams.push(endDate)
      countIndex++;
     }
         if (type) {
      countQuery += ` AND t.type = $${countIndex}`;
      countParams.push(type);
      countIndex++;
    }
    if (category_id) {
      countQuery += ` AND t.category_id = $${countIndex}`;
      countParams.push(category_id);
      countIndex++;
    }
    const countResult = await db.query(countQuery,countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems/limitNum);
    return res.status(200).json({
      page: pageNum,
      limit : limitNum,
      totalItems,
      totalPages,
      transactions : result.rows
    });
            
  } catch (error) {
    console.error("Error filtering transaction", error);
    return res.status(500).json({message : "Server error"});
  }  
}
// Get summary of transactions
export async function getTransactionsSummary(req, res) {
  try {
    const userId = req.user.id
    // total Income
    const incomeResult = await db.query("SELECT COALESCE(sum(amount), 0) AS total_income from transactions WHERE user_id =$1 AND type ='income' ", [userId]);

    // total expenses
    const expenseResult = await db.query("SELECT COALESCE(sum(amount), 0) AS total_expenses from transactions WHERE user_id = $1 AND type = 'expense' ", [userId]);

    // Monthly Income Summarry

    const monthlyIncomeResult = await db.query("SELECT COALESCE(sum(amount), 0) AS monthly_income from transactions WHERE user_id = $1 AND type ='income' AND DATE_TRUNC('month', date)= DATE_TRUNC('month', CURRENT_DATE) ", [userId]);

    // Monthly expense Summarry

    const monthlyExpenseResult = await db.query("SELECT COALESCE(sum(amount), 0) AS monthly_expenses from transactions WHERE user_id = $1 AND type ='expense' AND DATE_TRUNC('month', date)= DATE_TRUNC('month', CURRENT_DATE) ", [userId]);


    // Per-category Monthly breakdown
    const monthlyCategoryResult = await db.query(
      `SELECT c.name AS category, 
        COALESCE(SUM(t.amount), 0) AS total
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = $1
       AND DATE_TRUNC('month', date)= DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [userId]
    );

    const totalIncome = parseFloat(incomeResult.rows[0].total_income);
    const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);
    const balance = totalIncome - totalExpenses;

    const monthlyIncome = parseFloat(monthlyIncomeResult.rows[0].monthly_income);
    const monthlyExpenses = parseFloat(monthlyExpenseResult.rows[0].monthly_expenses);
    const monthlyBalance = monthlyIncome - monthlyExpenses;

        return res.status(200).json({
      all_time : {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance,
      },
      current_month : {
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        monthly_balance: monthlyBalance,
        per_category: monthlyCategoryResult.rows,
      }
    });    
    
  } catch (error) {
    console.error("Error fetching transaction summary:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

// Graphs AND Chart 

// Expenses grouped by category (for pie chart)
  export async function getExpenseByCategories(req, res){
    try {
      const userId = req.user.id
      const result = await db.query("SELECT c.name AS category, COALESCE(sum(t.amount), 0) AS total FROM categories c LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = $1 AND t.type = 'expense' GROUP BY c.id, c.name ORDER BY total DESC ", [userId]);
      return res.status(200).json(result.rows)
    } catch (error) {
      console.error("Error fetching expense by category", error)
      return res.status(500).json({message : "SERVER ERROR"})
    }
  }

  // Monthly spending trend (for line/bar chart)
  export async function getSpendingTrend(req, res) {
    try {
      const userId = req.user.id
      const result = await db.query("SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income, SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)AS expense FROM transactions  WHERE user_id = $1 GROUP BY month ORDER BY TO_CHAR(date, 'YYYY-MM')  ASC", [userId] );

      return res.status(200).json(result.rows)
    
      
    } catch (error) {
      console.error("Error fetching spending trend", error);
      return res.status(500).json({message : "SERVER ERROR"});
      
    }    
  }

  // Total income vs expenses (for bar chart)

  export async function getIncomeVsExpense(req, res) {
    try {
      const userId = req.user.id
      const result = await db.query("SELECT type, SUM(amount) AS total FROM transactions WHERE user_id = $1 GROUP BY type", [userId]);
      return res.status(200).json(result.rows);
      
    } catch (error) {
      console.error("Error fetching Invoice Vs Expense", error);
      return res.status(500).json({message : "SERVER ERROR"});
    }
    
  }
// Export Transaction to CSV

export async function exportTransactionCSV(req, res) {
  
  try {
    const result = await db.query("SELECT t.id, t.amount, t.type, c.name AS category, t.description, TO_CHAR(t.date, 'YYYY-MM-DD') AS date FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id =$1 ORDER BY t.date", [req.user.id]);

     const fields = ["id", "amount", "type", "category", "description", "date"];
     const parser = new Parser({fields});
     const csv = parser.parse(result.rows);

     res.header("Content-Type", "text/csv");
     res.attachment("transactions.csv");
     return res.send(csv);

  } catch (error) {
    console.error("Error exporting CSV:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
// Export Transaction to PDF

export async function exportTransactionPDF(req, res) {
  try {
        const result = await db.query(`SELECT t.id, t.amount, t.type, c.name AS category, t.description, TO_CHAR(t.date,    'YYYY-MM-DD') AS date 
          FROM transactions t 
          LEFT JOIN categories c ON t.category_id = c.id 
          WHERE t.user_id =$1 ORDER BY t.date`
          , [req.user.id]);

          const doc = new PDFDocument();
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "attachment; filename=transactions.pdf");

          doc.pipe(res)
          // Title
          doc.fontSize(18).text("Transaction Report", { align: "center" });
          doc.moveDown();

          // column positions
          const tableTop = 100;
          const colX = {
            id: 50,
            amount: 100,
            type: 170,
            category: 250,
            description: 350,
            date: 460,
          };
          let y = tableTop + 25;
          // headers
          doc.fontSize(12).font("Helvetica-Bold");
          doc.text("ID", colX.id, tableTop);
          doc.text("Amount", colX.amount, tableTop);
          doc.text("Type", colX.type, tableTop);
          doc.text("Category", colX.category, tableTop);
          doc.text("Description", colX.description, tableTop);
          doc.text("Date", colX.date, tableTop);
          // Divider line
          doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
          
          // rows
          result.rows.forEach((row) => {
          doc.text(row.id, colX.id, y);
          doc.text(row.amount.toString(), colX.amount, y);
          doc.text(row.type, colX.type, y);
          doc.text(row.category || "NA", colX.category, y);
          doc.text(row.description || "", colX.description, y, { width: 150 });
          doc.text(row.date, colX.date, y);

          y += 20;

          //  Handle page break if needed
          if (y > 750) {
            doc.addPage();
            y = 50;
            
           // redraw header on new page
            doc.fontSize(12).font("Helvetica-Bold");
            doc.text("ID", colX.id, y);
            doc.text("Amount", colX.amount, y);
            doc.text("Type", colX.type, y);
            doc.text("Category", colX.category, y);
            doc.text("Description", colX.description, y);
            doc.text("Date", colX.date, y);

            doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();

            doc.font("Helvetica").fontSize(10);
            y += 25;
          }
        });

          doc.end();        
  } catch (error) {
    console.error("Error exporting PDF:", error);
    return res.status(500).json({ message: "Server error" });

  }
}

// Another detailed summary

export async function getReport(req, res) {
  const userId = req.user.id;
  try {
    // Monthly totals
    const monthlyTotals = await db.query(`
      SELECT
      TO_CHAR(date, 'Mon') AS month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = $1
      GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date)
      ORDER BY EXTRACT(MONTH FROM date);
    `, [userId]);

    // Income vs expense
    const incomeVsExpense = await db.query(`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = $1;
    `, [userId]);

    // Category breakdown
    const catBreakDwnRes = await db.query(`
      SELECT
        c.name AS category,
        SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
      AND c.name NOT IN ('Salary', 'Freelance')
      GROUP BY c.name
      ORDER BY total DESC;
    `, [userId]);

    // Format data
    const monthly = {
      months: monthlyTotals.rows.map(r => r.month),
      income : monthlyTotals.rows.map(r => parseFloat(r.income)),
      expenses : monthlyTotals.rows.map(r => parseFloat(r.expense))
    };

    const incomeExpense = {
      income: parseFloat(incomeVsExpense.rows[0].income) || 0,
      expense: parseFloat(incomeVsExpense.rows[0].expense) || 0
    };

    let categories = {};
    catBreakDwnRes.rows.forEach(r => {
      categories[r.category] = parseFloat(r.total);
    });

    return res.status(200).json({
      monthly,
      incomeExpense,
      categories
    });

  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({ error: "Failed to fetch reports summary" });
  }
}

// Categories
export async function getAllCategories(req, res) {
  try {
    const catRes = await db.query(`SELECT * FROM categories`);
     return res.status(200).json(catRes.rows);
    
  } catch (error) {
    console.error("Error fetching categories", error);
    return res.status(500).json({ error: "Failed to fetch Categories" });
  }
}