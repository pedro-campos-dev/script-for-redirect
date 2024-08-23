const fs = require("fs");
const csv = require("csv-parser");
const { json2csv } = require("json-2-csv");

const functionName = process.argv[2];
const inputFile = process.argv[3];
const outputFile = process.argv[4];

const updateForms = (forms) => {
  const newForms = forms.map((form) => {
    const usedByAI =
      form.Used_by_AI_Receptionist__c === "true" ||
      form.Used_by_AI_Receptionist__c === true
        ? true
        : false;
    const usedByHuman =
      form.Used_by_Human_Receptionist__c === "true" ||
      form.Used_by_Human_Receptionist__c === true
        ? true
        : false;
    if (usedByAI && usedByHuman) {
      form.Used_by_Human_Receptionist__c = true;
      form.Used_by_AI_Receptionist__c = false;
    } else if (!usedByAI && !usedByHuman) {
      form.Used_by_Human_Receptionist__c = true;
      form.Used_by_AI_Receptionist__c = false;
    }

    return form;
  });

  const newCsv = json2csv(newForms);
  fs.writeFileSync(outputFile, newCsv);
};

const readFormsAndUpate = () => {
  const listOfForms = [];

  fs.createReadStream(inputFile)
    .pipe(csv())
    .on("data", (data) => {
      listOfForms.push(data);
    })
    .on("end", () => {
      updateForms(listOfForms);
    });
};

const updatePicklists = (picklists) => {
  const redirectsForAccount = {};
  picklists.forEach((picklist) => {
    const accountId = picklist["Redirect_To_Form__r.Account__c"];
    const formId = picklist["Redirect_To_Form__c"];
    const picklistId = picklist["Id"];
    const usedByHumanReceptionist =
      picklist["Redirect_To_Form__r.Used_by_Human_Receptionist__c"];
    const usedByHuman =
      usedByHumanReceptionist === "true" || usedByHumanReceptionist === true
        ? true
        : false;
    let usedBy;
    if (usedByHuman) {
      usedBy = "usedByHuman";
    } else {
      usedBy = "usedByAI";
    }

    if (!redirectsForAccount[accountId]) {
      redirectsForAccount[accountId] = {
        usedByHuman: [],
        usedByAI: [],
      };
    }

    redirectsForAccount[accountId][usedBy].push({
      picklistValueId: picklistId,
      formId: formId,
    });
  });

  const listOfAccountsToUpdate = [];
  Object.keys(redirectsForAccount).forEach((accountId) => {
    console.log(accountId);
    const account = redirectsForAccount[accountId];
    const usedByAI = account.usedByAI;
    const usedByHuman = account.usedByHuman;
    listOfAccountsToUpdate.push({
      Id: accountId,
      AI_Form_Redirects__c: JSON.stringify(usedByAI),
      Human_Form_Redirects__c: JSON.stringify(usedByHuman),
    });
  });

  fs.writeFileSync(outputFile, json2csv(listOfAccountsToUpdate));
  //fs.writeFileSync(outputFile, JSON.stringify(listOfAccountsToUpdate));
};

const readPicklistsAndUpdate = () => {
  const listOfPicklists = [];

  fs.createReadStream(inputFile)
    .pipe(csv())
    .on("data", (data) => {
      listOfPicklists.push(data);
    })
    .on("end", () => {
      updatePicklists(listOfPicklists);
    });
};

if (functionName === "updateForms") {
  readFormsAndUpate();
} else if (functionName === "updatePicklist") {
  readPicklistsAndUpdate();
}
