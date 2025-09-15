import { Router } from "express";
import { loginUser, registerUser } from '../controllers/authControllers.js';
const router = Router();
// Registeration route
router.post("/register", registerUser);
// login route
router.post("/login", loginUser);







export default router;
