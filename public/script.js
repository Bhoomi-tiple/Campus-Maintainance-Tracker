
const API_URL = "/api/complaints";

const form = document.getElementById("complaintForm");
const complaintsList = document.getElementById("complaintsList");
const message = document.getElementById("message");

let editingId = null;

// Display custom messages
function showMessage(text, color = "green") {
    message.textContent = text;
    message.style.color = color;
}

// Fetch all complaints
async function fetchComplaints() {
    try {
        const response = await fetch(API_URL);
        const complaints = await response.json();

        complaintsList.innerHTML = "";

        if (complaints.length === 0) {
            complaintsList.innerHTML = "<p>No complaints available.</p>";
            return;
        }

        complaints.forEach(complaint => {
            const card = document.createElement("div");
            card.className = "complaint-card";

            const heading = document.createElement("h3");
            heading.textContent = complaint.category;

            const details = document.createElement("p");
            details.textContent =
                `Student: ${complaint.studentName} | Room: ${complaint.roomNumber}`;

            const description = document.createElement("p");
            description.textContent = "Description: " + complaint.description;

            const status = document.createElement("p");
            status.className = "status";
            status.textContent = "Status: " + complaint.status;

            const editButton = document.createElement("button");
            editButton.textContent = "Edit Complaint";
            editButton.onclick = () => editComplaint(complaint);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-btn";
            deleteButton.onclick = () => deleteComplaint(complaint._id);

            card.append(heading, details, description, status, editButton, deleteButton);
            complaintsList.appendChild(card);
        });

    } catch (error) {
        showMessage("Unable to load complaints. Please try again.", "red");
    }
}

// Submit or update complaint
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const complaint = {
        studentName: document.getElementById("studentName").value,
        roomNumber: document.getElementById("roomNumber").value,
        category: document.getElementById("category").value,
        description: document.getElementById("description").value
    };

    if (editingId) {
        complaint.status = document.getElementById("status").value;
    }

    try {
        const response = await fetch(
            editingId ? `${API_URL}/${editingId}` : API_URL,
            {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(complaint)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save complaint.");
        }

        showMessage(
            editingId
                ? "Your complaint has been updated successfully!"
                : "Your complaint has been submitted successfully!"
        );

        form.reset();
        removeStatusField();
        editingId = null;
        fetchComplaints();

    } catch (error) {
        showMessage(error.message, "red");
    }
});

// Edit complaint
function editComplaint(complaint) {
    editingId = complaint._id;

    document.getElementById("studentName").value = complaint.studentName;
    document.getElementById("roomNumber").value = complaint.roomNumber;
    document.getElementById("category").value = complaint.category;
    document.getElementById("description").value = complaint.description;

    let statusField = document.getElementById("status");

    if (!statusField) {
        statusField = document.createElement("select");
        statusField.id = "status";
        statusField.innerHTML = `
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
        `;

        form.insertBefore(statusField, form.querySelector("button"));
    }

    statusField.value = complaint.status;

    showMessage("You are now editing this complaint.", "#2563eb");

    form.scrollIntoView({ behavior: "smooth" });
}

// Remove status field after editing
function removeStatusField() {
    const statusField = document.getElementById("status");

    if (statusField) {
        statusField.remove();
    }
}

// Delete complaint
async function deleteComplaint(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this complaint?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to delete complaint.");
        }

        showMessage("The selected complaint has been deleted successfully!");
        fetchComplaints();

    } catch (error) {
        showMessage(error.message, "red");
    }
}

// Initial display
fetchComplaints();
