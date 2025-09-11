import { Router } from "express";
import { loginUser, registerUser } from '../controllers/authControllers.js';
const router = Router();
// Registeration route
router.post("/register", registerUser);
// login route
router.post("/login", loginUser);

router.post("/request-password-reset", (req, res) => {
  res.send("Reset route");
});

router.post("/verify-email", (req, res) => {
  res.send("Verify email");
});



export default router;
