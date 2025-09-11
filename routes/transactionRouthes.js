import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { addTransaction, 
 getAllUserTransactions, 
 deleteTransaction,
filterTransaction,
getTransactionsSummary,
getReport,
getExpenseByCategories,
getSpendingTrend,
getAllCategories,
getIncomeVsExpense,
exportTransactionCSV,
exportTransactionPDF, editTransaction ,
getTransactionById
} from "../controllers/transctionControllers.js";

const router = Router();

router.post("/add", verifyToken, addTransaction);
// add transaction
router.get("/all", verifyToken,getAllUserTransactions);
// delete logged-in user transaction
router.delete("/:id", verifyToken,deleteTransaction);
// Edit transaction
router.put("/edit/:id", verifyToken, editTransaction);
// Filter and sort transaction
router.get("/filter", verifyToken, filterTransaction);
// SUMMARY
router.get("/summary", verifyToken, getTransactionsSummary);
// report
router.get("/report", verifyToken, getReport);
// CHART ROUTES
// expense by category (pie chart)
router.get("/chart/categories", verifyToken, getExpenseByCategories);
// spending trend 
router.get("/chart/trend", verifyToken, getSpendingTrend);
// Invoice VS Expense bar chart
router.get("/chart/overview", verifyToken, getIncomeVsExpense);
// Export Transaction csv
router.get("/export/csv", verifyToken, exportTransactionCSV);
// EXport as pdf
router.get("/export/pdf", verifyToken, exportTransactionPDF);
// category end point
router.get("/categories", verifyToken, getAllCategories);


// get a single transaction: for some reason this route keeps affecting other routes, check later
router.get("/:id", verifyToken, getTransactionById);




export default router