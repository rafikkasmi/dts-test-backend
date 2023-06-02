require('dotenv').config();
//setting up express app
const express = require('express')
const app = express()
const cors = require('cors')
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000
const { getRethinkDBConnection } = require('./rethinkdb');
//setting up rethinkdb
const rethinkdb = require('rethinkdb')
const db = rethinkdb.db(process.env.RETHINKDB_NAME);



//setting up jira-client
const JiraApi = require('jira-client');
const jira = new JiraApi({
    protocol: 'https',
    host: process.env.JIRA_HOST || "dtstestrafik.atlassian.net",
    username: process.env.JIRA_USERNAME || 'test@email.com',
    password: process.env.JIRA_PASSWORD || 'pwd',
    apiVersion: '2',
    strictSSL: true
});

const PROJECT_NAME = "TES"


app.get('/', async (req, res) => {
    const connection = await getRethinkDBConnection()
    const results = await db.table('tasks').delete().run(connection);
    res.send('Hello to jira tasks api!')
})

app.get('/get-all-main-tasks', async (req, res) => {
    // const mainTask = await jira.findIssue('TES-1');
    const connection = await getRethinkDBConnection()
    const results = await db.table('tasks').run(connection);
    const data = await results.toArray();
    return res.status(200).json(data);
})

app.get('/get-main-task-by-id/:id', async (req, res) => {
    const connection = await getRethinkDBConnection()
    const mainTask = await db.table('tasks').get(req.params.id).run(connection);
    if (!mainTask) return res.status(400).json({ error: "main task not found" });
    return res.status(200).json(mainTask);
})

app.post('/create-jira-task/:mainTaskId', async (req, res) => {
    const connection = await getRethinkDBConnection()
    const mainTask = await db.table('tasks').get(req.params.mainTaskId).run(connection);
    if (!mainTask) return res.status(400).json({ error: "main task not found" });

    const { summary, description, assignee, priority } = req.body;
    if (!summary || !description || !assignee || !priority) return res.status(400).json({ error: "summary, description, assignee, priority are all required" });
    //create jira issue
    const jiraTask = await jira.addNewIssue({
        fields: {
            project: {
                key: PROJECT_NAME
            },
            summary,
            description,
            issuetype: {
                name: "Task"
            },
            priority: {
                name: priority
            },
            assignee: {
                name: assignee
            }
        }
    });
    if (!jiraTask) return res.status(500).json({ error: "failed to create jira task" });

    try {
        await db.table('tasks').get(req.params.mainTaskId).update({ jira_tasks: [...mainTask.jira_tasks, { task_id: jiraTask.id, summary, assignee }] }).run(connection);
        return res.status(200).json({ message: "success" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
})

app.post("/create-main-task", async (req, res, next) => {
    const { details } = req.body;
    if (!details) return res.status(400).json({ error: "details is required" });
    const connection = await getRethinkDBConnection()
    try {
        const resultInsertion = await db.table('tasks').insert({ details, jira_tasks: [] }).run(connection);
        return res.status(200).json({ message: "success" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

app.post("/create-task", async (req, res) => {
    const { title, description, assignee, reporter, priority, type, project } = req.body;
    const task = {
        "fields": {
            "project": {
                "key": PROJECT_NAME
            },
            "summary": title,
            "description": description,
            "issuetype": {
                "name": type
            },
            "priority": {
                "name": priority
            },
            "assignee": {
                "name": assignee
            }
        }
    }
    try {
        const response = await jira.addNewIssue(task);



        return res.send(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});



app.listen(PORT, () => {
    console.log(`app listening at http://localhost:${PORT}`)
})