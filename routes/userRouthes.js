import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getUserProfile, updateUserProfile,
 updateUserPassword
 } from "../controllers/userController.js";

const router = Router();
// get user
router.get("/me", verifyToken, getUserProfile);
// update user profile
router.put("/me", verifyToken, updateUserProfile);
// Password Reset
router.put("/me/password", verifyToken, updateUserPassword);





export default router;