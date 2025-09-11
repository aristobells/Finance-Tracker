import bcrypt from "bcrypt"
import db from "../config/db.js"
import { Result } from "pg"
import jwt from "jsonwebtoken";

export async function registerUser(req, res){
 const {firstname, lastname, email, password} = req.body
 if(!firstname || !lastname || !email || !password){
  return res.status(404).json({message : "All fields are required"})
 }
 else{
  try {
    const existingUser = await db.query("SELECT * FROM users WHERE email = $1", [email])
    if(existingUser.rows.length >0){
     return res.status(404).json({message : "Email already exist"})
    }
    else{
     const saltRounds =10
     bcrypt.hash(password, saltRounds, async (err, hash)=> {
       if(err){
        console.log("Error in hashing password", err)
       }
       else{
        const newUser = await db.query("INSERT INTO users (firstname, lastname, email, password_hash, is_verified) VALUES($1,$2,$3,$4,$5) RETURNING id, email", [firstname, lastname, email, hash, false]);
        
        await db.query( "INSERT INTO settings (user_id) VALUES ($1)",[newUser.rows[0].id]);

        res.status(201).json({ message: 'User registered successfully.', user: newUser.rows[0] });
       }
     })
    }

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
 }
}

// loginUser Controller

export async function loginUser(req, res) {
  const {email, password} =req.body
  if(!email || !password){
    return res.status(400).json({message: "All field are required"})
  }
  else{
    try {
      const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [email])
      // console.log(checkEmail)
      if(checkEmail.rows.length > 0){
        const storedPassword = checkEmail.rows[0].password_hash
        const user = checkEmail.rows[0]
        const isMatch = await bcrypt.compare(password, storedPassword)
        if(!isMatch){
           return res.status(401).json({ message: "Invalid email or password" });
        }
        else{
          const token = jwt.sign(
            {id: user.id, email : user.email, name : user.firstname},
            process.env.JWT_SECRET,
            {expiresIn : "1d"}
          )
          return res.status(200).json({ message: "Login successful", token });
        }
      }
      else {
        return res.status(401).json({ message: "Invalid email or password" });
}
      
    } catch (error) {
      console.error('Error Logining  user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}