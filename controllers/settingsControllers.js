import db from "../config/db.js";

// get user settings
export async function getUserSettings(req,res) {
 try {
    const result = await db.query(`
   SELECT * FROM settings WHERE user_id = $1`,
   [req.user.id]
  );
  if(result.rows.length === 0){
   return res.status(404).json({message: "Settings not found"});
  }   
   return res.status(200).json(result.rows[0]);
 } catch (error) {
    console.error("Error fetching settings", error);
    return res.status(500).json({ message: "Server error" });
 }
}

// update settings

export async function updateSettings(req, res) {
 try {
  const {default_currency} = req.body;
  if(!default_currency){
   return res.status(400).json({message : "default currency field required"})
  }
  const result = await db.query(`
    UPDATE settings 
    SET default_currency = $1, updated_at = NOW()
    WHERE user_id = $2
    RETURNING *`
   , [default_currency,req.user.id]);
   
   if(result.rows.length === 0){
    return res.status(404).json({message : "Settings not found"});
   }

   return res.status(200).json({message : "Settings Updated Successfully"
    , settings : result.rows[0]});
 } catch (error) {
    console.error("Error updating settings", error);
    return res.status(500).json({ message: "Server error" });
 }
}