const operationForm = document.getElementById("operation-form");
const adminForm = document.getElementById("admin-form");
const adminLink = document.getElementById("admin-open");
const accumulator = document.getElementById("accumulator");
const historyTop = document.getElementById("history-list");

// returns a string representation of the number, capped at 8 digits of precision
// in order to avoid floating point nonsense
const formatNumber = function(num) {
  return ((num.toString().length < 9) ? num.toString() : num.toFixed(8));
}

const update = async function (rawData) {
  console.log( 'data:', rawData )
  let parsedData = JSON.parse(rawData);
  let acc = 0;

  // update the history
  // first, clear the existing history entries
  Array.from(document.getElementsByClassName("history-entry")).forEach(entry => entry.remove())
  
  // start from zero
  let opElement = "<li class='history-entry list-group-item'>0</li>";
  historyTop.insertAdjacentHTML("afterbegin", opElement);
  
  for (const operation of parsedData) {
    // update the accumulator
    if (operation.operator === "plus")
      acc += operation.value;
    else if (operation.operator === "minus")
      acc -= operation.value;
    else if (operation.operator === "times")
      acc *= operation.value;
    else if (operation.operator === "divide") {
      // divide-by-zero check is done server side
      acc /= operation.value;
    }

    // insert the operation into the history with attached forms for edit and delete
    let opElement = `<li class='history-entry list-group-item row'>
    <div class="d-flex column-gap-2 align-items-start">
                          <p>&${operation.operator}; ${formatNumber(operation.value)} = ${formatNumber(acc)}</p>
                          <button class="btn btn-secondary" onclick='document.getElementById("edit-${operation._id}").hidden = false'>edit</button>
                          <form action="/delete" method="post" class="delete-form col-auto" id="delete-${operation._id}">
                            <button class="btn btn-danger" type="submit">delete</button>
                            <input type="hidden" name="id" value="${operation._id}" hidden>
                          </form>
                          </div>
                          <form action="/edit" method="post" class="edit-form" id="edit-${operation._id}" hidden>
                            <input type="number" step="any" required name="value" />
                            <button class="btn btn-primary" type="submit">confirm</button>
                            <input type="hidden" name="id" value="${operation._id}">
                          </form>
                      </li>`
    historyTop.insertAdjacentHTML("afterbegin", opElement);
    // add event listeners to the edit/delete forms
    document.getElementById(`edit-${operation._id}`).addEventListener("submit", (event) => submitEdit(event, `edit-${operation._id}`));
    document.getElementById(`delete-${operation._id}`).addEventListener("submit", (event) => submitDelete(event, `delete-${operation._id}`));
  }
  
  accumulator.innerText = formatNumber(acc);
}

const submitOperation = async function( event) {
  // stop form submission from trying to load
  // a new .html page for displaying results...
  // this was the original browser behavior and still
  // remains to this day
  event.preventDefault()
  
  // I pulled this way of handling data from 
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/radio
  const data = new FormData(operationForm);
  const json = { operator: data.get("operator"), value: Number.parseFloat(data.get("value")) };
  const body = JSON.stringify( json )

  const response = await fetch( '/submit', {
    method:'POST',
    body 
  })

  const text = await response.text()
  update(text);
}

const submitEdit = async function (event, formid) {
  event.preventDefault();
  const data = new FormData(document.getElementById(formid));
  const json = { id: data.get("id"), newValue: data.get("value") };
  const body = JSON.stringify( json );

  const response = await fetch( '/edit', {
    method:'POST',
    body 
  })

  const text = await response.text()
  update(text);
}

const submitDelete = async function (event, formid) {
  event.preventDefault();
  const data = new FormData(document.getElementById(formid));
  const json = { id: data.get("id") };
  const body = JSON.stringify( json );

  const response = await fetch( '/delete', {
    method:'POST',
    body
  })

  const text = await response.text()
  update(text);
}


operationForm.addEventListener("submit", submitOperation);

// set username using cookie
// code adapted from https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#examples
document.getElementById("user-display").innerText = "Logged in as: ".concat(document.cookie.split("; ").find((row) => row.startsWith("username="))?.split("=")[1]);

// from https://stackoverflow.com/questions/73519865/is-there-a-way-to-execute-asynchronous-code-inline-within-a-synchronous-function
(async () => {
  let initialData = await (await fetch("/data")).text();
  update(initialData);
})()