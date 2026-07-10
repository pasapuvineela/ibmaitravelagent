import {
  AuthError,
  handleAuthCallback,
  login,
  oauthLogin,
  requestPasswordRecovery,
  signup,
  getUser
} from "https://esm.sh/@netlify/identity@1.2.0";

const toast = (message, isError = false) => {
  const element = document.getElementById("appToast");
  if (!element) return;
  element.querySelector("span").textContent = message;
  element.querySelector("i").className = isError ? "bi bi-exclamation-circle-fill text-danger" : "bi bi-check-circle-fill text-success";
  bootstrap.Toast.getOrCreateInstance(element).show();
};

const showFormError = (form, message = "") => {
  const error = form?.querySelector(".auth-error");
  if (!error) return;
  error.textContent = message;
  error.classList.toggle("show", Boolean(message));
};

const setLoading = (form, loading) => {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading ? '<span class="spinner-border spinner-border-sm me-2"></span>Please wait' : button.dataset.label;
};

const friendlyError = (error) => {
  if (!(error instanceof AuthError)) return "Authentication is temporarily unavailable.";
  if (error.status === 401) return "The email or password is incorrect.";
  if (error.status === 403) return "This account action is not currently allowed.";
  if (error.status === 422) return "Please review the email and password requirements.";
  return error.message;
};

async function processCallback() {
  try {
    const result = await handleAuthCallback();
    if (!result) return;
    if (result.type === "confirmation") toast("Email confirmed. You are now logged in.");
    if (result.type === "oauth") toast("Welcome back to Roamly");
    if (result.user) {
      localStorage.setItem("roamly-user", JSON.stringify({ email: result.user.email, name: result.user.name || result.user.email }));
      setTimeout(() => window.location.href = "/dashboard", 700);
    }
  } catch (error) {
    toast(friendlyError(error), true);
  }
}

processCallback();
getUser().then((user) => {
  if (user) localStorage.setItem("roamly-user", JSON.stringify({ email: user.email, name: user.name || user.email }));
});

document.querySelectorAll("[data-auth-form]").forEach((form) => {
  const button = form.querySelector('button[type="submit"]');
  button.dataset.label = button.innerHTML;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;
    showFormError(form);
    setLoading(form, true);
    try {
      const mode = form.dataset.authForm;
      const email = form.querySelector('input[type="email"]').value;
      const password = form.querySelector('input[type="password"]').value;
      const user = mode === "register"
        ? await signup(email, password, { full_name: document.getElementById("fullName").value })
        : await login(email, password);
      if (mode === "register" && !user.emailVerified) {
        toast("Check your email to confirm your account");
        setLoading(form, false);
        return;
      }
      localStorage.setItem("roamly-user", JSON.stringify({ email: user.email, name: user.name || email }));
      toast(mode === "register" ? "Account created" : "Welcome back");
      setTimeout(() => window.location.href = "/dashboard", 650);
    } catch (error) {
      showFormError(form, friendlyError(error));
      setLoading(form, false);
    }
  });
});

document.getElementById("googleLogin")?.addEventListener("click", () => oauthLogin("google"));
document.getElementById("forgotPassword")?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail")?.value;
  if (!email) return toast("Enter your email address first", true);
  try {
    await requestPasswordRecovery(email);
    toast("Check your email for a recovery link");
  } catch (error) {
    toast(friendlyError(error), true);
  }
});
