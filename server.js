import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import methodOverride from "method-override";


const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(cookieParser());
app.use(express.static("public"));

const API_URL ="http://localhost:3000"


// Home page
app.get("/", async (req, res) => {
  console.log(req.body)
  res.render("index.ejs");
});

// Render the registeraton page
app.get("/register", async (req, res) => {
  res.render("auth/register.ejs");
});
// Render Login page
app.get("/login", async (req, res)=>{
  res.render("auth/login.ejs");
});

//  Registeration
app.post("/register", async (req, res) => {
 try {
  const {firstname, lastname,email, password} = req.body;
  const txRes = await axios.post(`${API_URL}/auth/register`, {
   firstname, 
   lastname,
   email, 
   password});
  //  console.log(txRes) 
     res.render("auth/login.ejs", {message: txRes.data.message, error: null });
  
 } catch (err) {
    console.error(err.response?.data || err.message);

    res.render("auth/register.ejs", { 
      message: null, 
      error: err.response?.data?.message || "Registration failed" 
    });
  }
});
// LOGIN

app.post("/login", async (req, res)=> {
  try {
    const {email, password} = req.body;
    const response = await axios.post(`${API_URL}/auth/login`, {email, password});
    res.cookie("token", response.data.token, {httpOnly : true});

    res.redirect("/dashboard");

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.render("auth/login.ejs", { error: error.response?.data?.message || "Login failed" });
  }
});

// Log Out
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});


app.get("/dashboard", async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.decode(token)

    const [summaryRes, transRes, expenseByCatRes, incomeVsExpenseRes, report] = await Promise.all([
      axios.get(`${API_URL}/transactions/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${API_URL}/transactions/all`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${API_URL}/transactions/chart/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${API_URL}/transactions/chart/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${API_URL}/transactions/report`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
    ]);
    // console.log(report.data)
    // console.log(decoded)

    res.render("dashboard.ejs", { 
      user : decoded,
      summary: summaryRes.data, 
      transactions: transRes.data,
      expenseByCategory: expenseByCatRes.data,
      incomeVsExpense: incomeVsExpenseRes.data,
      report : report.data
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.redirect("/login");
  }
});

// delete Transaction
app.post("/transactions/delete/:id", async (req, res) => {
try {
    const { id } = req.params;
    const token = req.cookies.token;
   await axios.delete(`${API_URL}/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      } );
   console.log("Deleted sucessfully")    
  //  console.log(id)
  res.redirect("/dashboard"); 
  
} catch (error) {
    console.error(error.response?.data || error.message);
    res.redirect("/dashboard");
}
});

// Helper function for Transaction page
async function renderTransactionPage(req, res, {transactionId, editing}) {
  const token = req.cookies.token;
  const decoded = jwt.decode(token)
  const catPromise = axios.get(`${API_URL}/transactions/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let transaction = null;
  if(transactionId){
        const tranRes= await axios.get(`${API_URL}/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      transaction = tranRes.data      
    }

    const catRes = await catPromise
    res.render("transactions.ejs", {
    user: decoded,
    transaction,
    categories: catRes.data,
    editing
  });
}

app.get("/transactions/add", (req, res) => {
  renderTransactionPage(req, res, {transactionId: null, editing: false });
});

app.get("/transactions/edit/:id", (req, res) => {
  renderTransactionPage(req, res, { transactionId: req.params.id, editing: true });
});

// Add Transactions
app.post("/transactions/add", async (req, res)=> {
  try {
    const token = req.cookies.token;
    // const decoded = jwt.decode(token);
    const {amount, date, type, category_id,description} = req.body;
    await  axios.post( 
      
      `${API_URL}/transactions/add`,

       {amount, date, type, category_id, description },

       {headers: { Authorization: `Bearer ${token}`}}
       
      )
    res.redirect('/dashboard')
    // console.log(req.body)
    } catch (error) {
      console.error(error.response?.data || error.message);
      res.redirect("/transactions/add");
  }
});

// Edit transactions
app.put("/transactions/edit/:id", async (req,res)=> {
  
  try {

      const token = req.cookies.token;
      const {id } = req.params;
      const {amount, date, type, category_id,description} = req.body;
    
          await  axios.put( 
      
      `${API_URL}/transactions/edit/${id}`,

       {amount, date, type, category_id, description },

       {headers: { Authorization: `Bearer ${token}`}}
       
      )
      res.redirect('/dashboard');    
  } catch (error) {
      console.error(error.response?.data || error.message);
      res.redirect("/transactions/transactions/:id");
  }

})

// All transaction page with filtering

app.get("/alltranscations", async (req, res)=> {
  try {
    const {
            startDate,
            endDate,
            type,
            category_id,
            sort = 'date_desc',
            page = 1,
            limit = 10
        } = req.query;

      // query string for API call
      let queryString = `?page=${page}&limit=${limit}&sort=${sort}`;
      if (startDate) queryString += `&startDate=${startDate}`;
      if (endDate) queryString += `&endDate=${endDate}`;
      if (type) queryString += `&type=${type}`;
      if (category_id) queryString += `&category_id=${category_id}`;
      const response = await axios.get(`${API_URL}/transactions/filter${queryString}`, {
    headers: {
        'Authorization': `Bearer ${req.cookies.token}`
    }
    
  });

        // get categories for filter dropdown
        const catRes = await axios.get(`${API_URL}/transactions/categories`, {
            headers: {
                'Authorization': `Bearer ${req.cookies.token}`
            }
        });

        const categories =  catRes.data || [];
        const token = req.cookies.token;
         const decoded = jwt.decode(token)


        res.render('alltransactions.ejs', {
        user: decoded,
        transactions: response.data.transactions,
        currentPage: parseInt(page),
        totalPages: response.data.totalPages,
        totalItems: response.data.totalItems,
        limit: parseInt(limit),
        categories,
        filters: {
            startDate,
            endDate,
            type,
            category_id,
            sort,
            limit: parseInt(limit)
        },
        generatePageUrl: function(page) {
            const url = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
            url.searchParams.set('page', page);
            return url.pathname + url.search;
        }
    });


        
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Server error while fetching transactions");
  }
})

// Report routes
app.get("/reports", (req, res)=>{
  const token =req.cookies.token
  const decoded  = jwt.decode(token)

  res.render("report.ejs", {user : decoded})
})

// Buget logic 

app.get("/budgets/add", async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.decode(token);

    const catRes = await    axios.get(`${API_URL}/transactions/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const categories = catRes.data || [];
    
    res.render("budget.ejs", { 
      categories, 
      user: decoded, 
      editing: false,
      budget: null
     });
  } catch (error) {
    console.error("Error rendering budget form:", error.message);
    res.status(500).send("Failed to load budget form");
  }
});

// Create new budget
app.post("/budgets/add", async (req, res)=>{
  try {
    const {category_id, amount, period_start, period_end,} = req.body;
    const token = req.cookies.token;
    await axios.post(
      `${API_URL}/budget/add`,
      {category_id,amount, period_start, period_end},
      {headers : {"Authorization" : `Bearer ${token}`}}
    )
    res.redirect("/budgets")
  } catch (error) {
        console.error(error.response?.data || error.message);
        res.redirect("/budget/add");
  }
})

// GET Edit form
app.get("/budgets/edit/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const token = req.cookies.token;
    const decoded = jwt.decode(token);

    const [catRes, budgetRes ] = await Promise.all([
      axios.get(`${API_URL}/transactions/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
     axios.get(`${API_URL}/budget/${id}`, {
      headers : {"Authorization": `Bearer ${token}`}
    })
    ]);

    const categories = catRes.data || [];
    const budget = budgetRes.data
    // console.log(budget)
    res.render("budget.ejs", { 
      categories, 
      user: decoded, 
      editing: true,
      budget
     });
  } catch (error) {
    console.error("Error rendering budget form:", error.message);
    res.status(500).send("Failed to load budget form");
  }
});

// EDIT budget

app.put("/budgets/edit/:id", async (req,res)=>{
  try {
    const {id} = req.params;
    const token = req.cookies.token
    const {category_id, amount, period_start, period_end,} = req.body;
    await axios.put(
          `${API_URL}/budget/edit/${id}`,
          {category_id,amount, period_start, period_end},
          {headers : {"Authorization" : `Bearer ${token}`}}
        )
    res.redirect("/budgets")
  } catch (error) {
      console.error(error.response?.data || error.message);
      res.status(500).send("Failed to load budget form");
  }

});

// DELETE budget
app.delete("/budgets/delete/:id", async (req, res)=>{
  try {
    const {id} = req.params;
    const token = req.cookies.token;
    await axios.delete(`${API_URL}/budget/delete/${id}`, {
      headers : {"Authorization" : `Bearer ${token}`}
    })
    console.log("DELETED SUCCESSFULLY")
    res.redirect("/budgets");
  } catch (error) {
    console.error("Error DELETING budget", error);
    res.redirect("/budgets")
  }
});
// Budget list page

app.get("/budgets", async (req,res)=> {
  try {
        const token = req.cookies.token;
        const decoded = jwt.decode(token);
    // get  user's budget
    const budgetRes = await axios.get(`${API_URL}/budget/all`, {
      headers : {"Authorization" : `Bearer ${token}`}
    });

    const bugets = budgetRes.data
    // progress for each buget

    const budgetsWithProgress = await Promise.all(
      bugets.map(async (budget)=>{
        try {
         const progressRes = await axios.get(`${API_URL}/budget/progress/${budget.id}`, {
          headers : {"Authorization" : `Bearer ${token}`}
    })
        const progress = progressRes.data
        return {...budget,progress} 
        } catch (error) {
          console.error(`Error fetching budget ${budget.id}  progress `)
          return budget;
        }
      })

    )

        // Helper function for EJS template
    const getProgressColor = (percentage) => {
        if (percentage <= 70) return '#2ecc71';
        if (percentage <= 90) return '#f39c12';
        return '#e74c3c';
    };

        res.render('allbudget.ejs', {
        budgets: budgetsWithProgress,
        success: req.query.success,
        error: req.query.error,
        getProgressColor,
        user: decoded
    });
  } catch (error) {
    const token = req.cookies.token;
    const decoded = jwt.decode(token);
    console.error("Error loading budgets:", error.response?.data || error.message);
    res.status(500).render("errorPage.ejs", {
    user: decoded,
    error: error.response?.data?.message || error.message || "Something went wrong"
});
  }
});







app.listen(4000, () => {
  console.log(`🚀 Server running on Port 4000`);
});