function checkAuth() {
    const email = sessionStorage.getItem("email");
    const username = sessionStorage.getItem("username");
  
    if (!email || !username) {
      window.location.href = "login.html";
    }
  }