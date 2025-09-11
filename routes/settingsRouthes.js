import { Router } from "express";
import { getUserSettings,
 updateSettings
 } from "../controllers/settingsControllers.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/settings", verifyToken, getUserSettings);
router.put("/update-settings", verifyToken, updateSettings);



export default router;