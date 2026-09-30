const axios = require('axios');

const sendSMS = async (options) => {
  try {
    /* 
      // TUSAALE - HADDII AAD ISTICMAALEYSO TWILIO
      const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: options.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: options.phone
      });
    */

    /*
      // TUSAALE - HADDII AAD ISTICMAALEYSO SHIRKAD SOMALI AH (API Endpoint)
      const smsApiUrl = process.env.SMS_API_URL || 'https://api.sms-provider.com/send';
      const response = await axios.post(smsApiUrl, {
        apiKey: process.env.SMS_API_KEY,
        to: options.phone,
        message: options.message,
        senderId: 'RealEstate'
      });
    */
    
    // For now, if no API is configured, log it to the server console.
    console.log(`\n*** [SMS API TRIGGERED] Message to ${options.phone}: ${options.message} ***\n`);
    
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    throw new Error('Fariinta lama diri karin. (Could not send SMS)');
  }
};

module.exports = sendSMS;
