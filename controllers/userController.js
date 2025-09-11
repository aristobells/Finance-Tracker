import db from "../config/db.js";
import bcrypt from "bcrypt"

// Get login-user details
export async function getUserProfile(req, res) {

 try {
  const result = await db.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
  return res.status(200).json(result.rows[0])
 } catch (error) {
  console.error("ERORR GETTING USER PROFILE", error);
  return res.status(500).json({message: "Sever Error"});
 }
 
}

// update user profile

export async function updateUserProfile(req, res) {
 try {
  const {firstname, lastname} = req.body;
  const result = await db.query(`
   UPDATE users SET firstname = $1, lastname = $2
   WHERE id =$3 RETURNING id, firstname, lastname
   `, [firstname,lastname, req.user.id]);
   return res.json({message : "Profile update", user: result.rows[0]});
   
 } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Server error" });
 }

}

// Password Reset

export async function updateUserPassword(req, res) {
 try {
  const {oldPassword, newPassword} = req.body;
  const user = await db.query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
  const storedPassword = user.rows[0].password_hash;
  const valid = await bcrypt.compare(oldPassword, storedPassword);
  if(!valid){
   return res.status(400).json({message : "Old password Incorrect"});
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, req.user.id]);
  return res.json({message: "Password updated successfully"});
 } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Server error" });
 } 
}