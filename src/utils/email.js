const nodemailer =require('nodemailer');


const sendEmail =async(option)=>{
  //CERATE A TRANSPORTER
  const transporter = nodemailer.createTransport({
    host:process.env.EMAIL_HOST,
    port:process.env.EMAIL_PORT,
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASSWORD
    }
  })
    
// console.log(transporter)
  //DEFINE EMAIL OPTIONS
  const emailOptions ={
    from :'Arayas Kitchen support<support@arayaskitechen.com>',
    to:option.email,
    subject:option.subject,
    text:option.message
  }   
  await transporter.sendMail(emailOptions);
}

module.exports = sendEmail;