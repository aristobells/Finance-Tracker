// needed for future frontend and backend sepration

// import express from "express"
// import db from "./config/db.js";
// import authRoutes from './routes/authRoutes.js';
// import transactionsRouthes from "./routes/transactionRouthes.js";
// import userRouthes from "./routes/userRouthes.js";
// import settingsRouthes from "./routes/settingsRouthes.js";
// import budgetRouthes from "./routes/budgetRouthes.js";
// import bodyParser from "body-parser";

// const app = express();
// const PORT = process.env.PORT

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json());

// app.use('/auth', authRoutes);
// app.use('/transactions', transactionsRouthes);
// app.use("/userprofile", userRouthes);
// app.use("/user", settingsRouthes);
// app.use("/budget", budgetRouthes);

// app.get("/", async(req, res)=>{
//  const result = await db.query('SELECT NOW()')
//  res.send(`Database time: ${result.rows[0].now}`);
// })








// app.listen(PORT,()=>{
//   console.log(`🚀 Server running on port ${PORT}`);
// });

