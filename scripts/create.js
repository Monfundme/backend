const axios = require('axios');

require('dotenv').config();

const testCreateCampaign = async () => {
  console.log("Testing create campaign... ")
  try {

    const campaignData = {
      title: "Testiiiinnngggg",
      description: "This is a test campaign created via API",
      targetAmount: 100,
      deadline: 1745785863,
      campaignOwner: "0xAB49e973b6a443C9C34109D554Cb8d2826ffe4bE",
      imageUrl: "https://via.placeholder.com/150"
    };

    const response = await axios.post(`http://localhost:${process.env.PORT}/api/votes/create`, campaignData);

    console.log('Campaign created successfully:');
    console.log(response.data);

  } catch (error) {
    if (error.response) {
      console.error("error from server --- ", error?.response?.data);
    } else {
      console.error(error);
    }
  }
};

// Run the test
testCreateCampaign();
