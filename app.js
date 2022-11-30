const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjToResponseObj = (dbObj) => {
  return {
    id: dbObj.id,
    todo: dbObj.todo,
    priority: dbObj.priority,
    status: dbObj.status,
  };
};

// FUNCTIONS FOR CHECKING  QUERY PROPERTIES

const containsPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const containsOnlyPriority = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const containsOnlyStatus = (requestQuery) => {
  return requestQuery.status !== undefined;
};

// 1.GET TODOS API

app.get("/todos/", async (request, response) => {
  const { search_q = "", priority, status } = request.query;
  let getTodosQuery = "";

  switch (true) {
    case containsPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case containsOnlyPriority(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case containsOnlyStatus(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  const dbResponse = await db.all(getTodosQuery);

  response.send(dbResponse);
});

// 2.GET A SPECIFIC TODO

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getSpecificTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const requiredTodo = await db.get(getSpecificTodoQuery);
  response.send(requiredTodo);
});

// 3.CREATE A TODO API

app.post("/todos/", async (request, response) => {
  const { todo, priority, status, id } = request.body;

  const postTodoQuery = `INSERT INTO
                               todo (todo,priority,status,id)
                               VALUES 
                               ('${todo}','${priority}','${status}',${id});`;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

// 4.UPDATE A TODO API
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
  }

  const oldTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const oldTodo = await db.get(oldTodoQuery);
  const {
    todo = oldTodo.todo,
    priority = oldTodo.priority,
    status = oldTodo.status,
  } = request.body;

  const updateTodoQuery = `UPDATE 
                             todo
                             SET
                             todo = '${todo}',
                             priority = '${priority}',
                             status = '${status}'
                             WHERE 
                             id = ${todoId};`;

  await db.run(updateTodoQuery);

  response.send(`${updateColumn} Updated`);
});

// DELETE TODO API

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
