const axios = require('axios');

const testCreateCampaign = async () => {
    console.log("Testing create campaign... ")
  try {
    const campaignData = {
      title: "Test Campaign",
      description: "This is a test campaign created via API",
      goal: 1000, 
      userId: "testUser123", 
    };

    const response = await axios.post(`http://localhost:${process.env.PORT}/api/campaigns/create`, campaignData);

    console.log('Campaign created successfully:');
    console.log(response.data);

  } catch (error) {
    console.error('Error creating campaign:', error?.response);
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

// Run the test
testCreateCampaign();
