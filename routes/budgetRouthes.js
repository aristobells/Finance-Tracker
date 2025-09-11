import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createBudget, getUserBudget,
 getBudgetProgress, getBudgetAlert, getAllBudgetAlerts ,
editBudget, getBudgetById, deleteBudget} from "../controllers/budgetControllers.js";

const router = Router();
// Add new budget
 router.post("/add", verifyToken, createBudget);
 // budget edit
 router.put("/edit/:id", verifyToken, editBudget);
 // get all current user budgets
 router.get("/all", verifyToken, getUserBudget);
 // get the progress of a budget
 router.get("/progress/:id", verifyToken, getBudgetProgress);
 // ALerts
 router.get("/alert/:id", verifyToken, getBudgetAlert);
 router.get("/all-alerts", verifyToken, getAllBudgetAlerts);
 // Dlete a single budget
 router.delete("/delete/:id", verifyToken, deleteBudget);

// get single budget
 router.get("/:id", verifyToken, getBudgetById)
 

 export default router