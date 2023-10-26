// Define a User interface to represent user data
interface User {
    username: string;
    role: "seller" | "buyer";
}

// Initialize an array to store registered users
const users: User[] = [];

// Function to handle user registration
function registerUser(username: string, role: "seller" | "buyer"): void {
    if (users.find((u) => u.username === username)){
        console.log(`Sorry, this username is taken`);
        return;
    }
    const newUser: User = { username, role };
    users.push(newUser);
    console.log(`User ${username} registered as a ${role}`);
}

// Function to handle login
function login(username: string, role: "seller" | "buyer"): boolean {
    const user = users.find((u) => u.username === username && u.role === role);
    if (user) {
        console.log(`Welcome, ${user.username}! You are logged in as a ${user.role}`);
        return true;
    } 
    else {
        console.log("Login failed. Please check your username and role.");
        return false;
    }
}
