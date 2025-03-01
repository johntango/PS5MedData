import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";

// Load environment variables
dotenv.config();

// Initialize OpenAI API client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static frontend files

/**
 * Handles chat requests to OpenAI
 */
app.post("/chat", async (req, res) => {
    try {
        const { systemMessage, prompt, model, thread } = req.body;

        // Construct conversation history
        const messages = thread.length > 0 ? [...thread] : [{ role: "system", content: systemMessage }];
        messages.push({ role: "user", content: prompt });

        // Send request to OpenAI
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
        });

        const aiResponse = response.choices[0].message;

        res.json({ response: aiResponse, updatedThread: [...messages, aiResponse] });

    } catch (error) {
        console.error("OpenAI API Error:", error);
        res.status(500).json({ error: "Failed to fetch OpenAI response" });
    }
});
app.post("/validateSynData", async (req, res) => {
    try {
        let model = 'o1-preview'
        let { input_data } = req.body;
        let messages = [
            {
                "role": "user",
                "content": ` """
                You are a helpful assistant designed to validate the quality of medical datasets. You will be given a single row of medical data, and your task is to determine whether the data is valid.
                
                - Carefully analyze the data for any inconsistencies, contradictions, missing values, or implausible information.
                - Consider the logical relationships between different fields (e.g., treatments should be appropriate for the diagnoses, medications should not conflict with allergies, lab results should be consistent with diagnoses, etc.).
                - Use your general medical knowledge to assess the validity of the data.
                - Focus solely on the information provided without making assumptions beyond the given data.
                
                **Return only a JSON object** with the following two properties:
                
                - "is_valid": a boolean (true or false) indicating whether the data is valid.
                - "issue": if "is_valid" is false, provide a brief explanation of the issue; if "is_valid" is true, set "issue" to null.
                
                Both JSON properties must always be present.
                
                Do not include any additional text or explanations outside the JSON object.
                
                MEDICAL DATA:
                ${input_data}
                """ 
                `
            }
        ]
        let response = await openai.chat.completions.create({
            model: model,
            messages: messages
        });
        let data = response.choices[0].message.content.replace('```json', '').replace('```', '').strip()
        // check if data is an object { }

        res.json();


    } catch (error) {

    }
})
app.post("/createSynData", async (req, res) => {
    try {
        let model = 'o1-preview'
        let messages = [
            {
                "role": "user",
                "content": `"""
                    You are a helpful assistant designed to generate data. You will be given a format for the data to generate and some examples of the data.

                    When generating Patient IDs, use the format 'P' followed by a three-digit number (e.g., P006, P941, P319).

                    Intentionally make some mistakes in the data generation and document them in the appropriate columns ('Is Valid' and 'Issue') if the row of data is invalid.

                    The types of mistakes to include are:

                    - **Allergy Contradictions**: Prescribing a medication that the patient is allergic to (e.g., prescribing Penicillin to a patient allergic to Penicillin).
                    - **Medical History and Medication Mismatch**: A patient with a medical condition not receiving appropriate medication (e.g., a diabetic patient not prescribed any diabetes medication).
                    - **Lab Results and Diagnosis Mismatch**: Lab results that do not support the diagnosis (e.g., normal glucose levels but diagnosed with Diabetes Type 2).
                    - **Other Plausible Mistakes**: Any other realistic errors that could occur in medical records, such as incorrect gender entries, impossible dates of birth, or inconsistent treatment plans.

                    Ensure that when 'Is Valid' is 'False', the 'Issue' column clearly explains the problem.

                    Return 100 rows of data for the user. Your response should strictly be in the format of a valid CSV.

                    Generate Synthetic Medical Records Dataset with the following columns:
                        - Patient ID: A randomly generated patient id
                        - Date of Birth: Date of birth of the patient
                        - Gender: M/F
                        - Medical History: Past diagnoses
                        - Current Medications: Medication the patient is taking
                        - Allergies: Identified allergies
                        - Lab Results (Glucose mg/dL)
                        - Diagnoses: Current diagnosis
                        - Treatment Plan: Current treatment plan
                        - Is Valid: Whether or not the current row of data is valid (True/False)
                        - Issue: If the row of data is not valid, what the issue is

                    Patient ID,Date of Birth,Gender,Medical History,Current Medications,Allergies,Lab Results (Glucose mg/dL),Diagnoses,Treatment Plan,Is Valid,Issue
                    P001,1980-05-14,M,Hypertension,Lisinopril,None,110,Hypertension,Continue Lisinopril,True,
                    P002,1975-11-30,F,Diabetes Type 2,Metformin,Penicillin,90,Diabetes Type 2,Continue Metformin,True,
                    P003,1990-07-22,F,Asthma,Albuterol,Aspirin,85,Asthma,Prescribe Albuterol,True,
                    P004,2000-03-10,M,None,Amoxicillin,Penicillin,95,Infection,Prescribe Amoxicillin,False,Prescribed Amoxicillin despite Penicillin allergy
                    P005,1985-09-18,F,Hyperlipidemia,Atorvastatin,None,200,Hyperlipidemia,Continue Atorvastatin,True,
                    P006,1978-12-05,M,Hypertension; Diabetes Type 2,Lisinopril; Insulin,None,55,Diabetes Type 2,Adjust insulin dosage,False,Low glucose level not properly addressed
                """`
            }
        ];

        let response = await openai.chat.completions.create({
            model: model,
            messages: messages
        });
        let data = response.choices[0].message.content.replace('```csv', '').replace('```', '');
        // write data to "data/sytheticMed.csv"


        res.json("Synthetic data added to file")

    }
    catch (error) {
        console.error("OpenAI API Error:", error);
        res.status(500).json({ error: "Failed to fetch OpenAI response" });

    }
});





// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});