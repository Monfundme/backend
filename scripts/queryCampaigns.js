const queryCampaigns = async () => {

    async function fetchGraphQL(operationsDoc, operationName, variables) {
        const result = await fetch(
            "http://localhost:8080/v1/graphql",
            {
                method: "POST",
                body: JSON.stringify({
                    query: operationsDoc,
                    variables: variables,
                    operationName: operationName
                })
            }
        );

        return await result.json();
    }

    const operationsDoc = `
  query MyQuery {
    Campaign {
      campaignId
      createdAt
      currentAmount
      deadline
      description
      id
    }
  }
`;

    function fetchMyQuery() {
        return fetchGraphQL(
            operationsDoc,
            "MyQuery",
            {}
        );
    }

    async function startFetchMyQuery() {
        const { errors, data } = await fetchMyQuery();

        if (errors) {
            console.error(errors);
        }

        // do something great with this precious data
        console.log(data);
    }

    startFetchMyQuery();
}

queryCampaigns();