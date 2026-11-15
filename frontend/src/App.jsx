
import { useState } from 'react';
import './App.css';

function App() {
  const [role, setRole] = useState('student');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: '',
    phone: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setIsRegister(false);
    setMessage('');
  };

  const redirectToDashboard = (userRole) => {
    if (userRole === 'admin') {
      window.location.href = '/admin-dashboard.html';
    } else if (userRole === 'staff') {
      window.location.href = '/staff-dashboard.html';
    } else {
      window.location.href = '/student-dashboard.html';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = isRegister
        ? '/api/auth/register'
        : '/api/auth/login';

      const payload = isRegister
        ? {
            name: form.name,
            email: form.email,
            password: form.password,
            studentId: form.studentId,
            department: form.department,
            phone: form.phone,
            role: 'student',
          }
        : {
            email: form.email,
            password: form.password,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid server response');
      }

      if (data.user.role !== role) {
        throw new Error(
          `This account does not belong to the ${role} role.`
        );
      }

      // Preserve existing per-tab authentication system
      sessionStorage.setItem('cmms_tab_token', data.token);
      sessionStorage.setItem(
        'cmms_tab_user',
        JSON.stringify(data.user)
      );

      redirectToDashboard(data.user.role);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal">
      <section className="welcome-panel">
        <div className="brand">
          <div className="brand-icon">CM</div>
          <span>CampusCare</span>
        </div>

        <div className="welcome-content">
          <span className="welcome-tag">
            CAMPUS MAINTENANCE SYSTEM
          </span>

          <h1>A better campus starts with you.</h1>

          <p>
            Report issues, track maintenance requests and help
            create a cleaner, safer and smarter campus.
          </p>

          <div className="feature-list">
            <div><span>✓</span> Easy complaint management</div>
            <div><span>✓</span> Real-time complaint tracking</div>
            <div><span>✓</span> Seamless communication</div>
          </div>
        </div>

        <div className="welcome-footer">
          © 2026 CampusCare. All rights reserved.
        </div>
      </section>

      <section className="login-panel">
        <div className="login-container">

          <div className="mobile-brand">
            <div className="brand-icon">CM</div>
            <span>CampusCare</span>
          </div>

          <div className="login-heading">
            <span className="small-label">WELCOME BACK</span>

            <h2>
              {isRegister
                ? 'Create your account'
                : 'Sign in to your account'}
            </h2>

            <p>
              {isRegister
                ? 'Register as a student to get started.'
                : 'Enter your details to access your dashboard.'}
            </p>
          </div>

          <div className="role-tabs">
            {['student', 'staff', 'admin'].map((item) => (
              <button
                type="button"
                key={item}
                className={
                  role === item ? 'role-tab active' : 'role-tab'
                }
                onClick={() => handleRoleChange(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && role === 'student' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    name="studentId"
                    value={form.studentId}
                    onChange={handleChange}
                    placeholder="Enter your student ID"
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="Enter your department"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                minLength={isRegister ? 6 : undefined}
                required
              />
            </div>

            {!isRegister && (
              <div className="form-options">
                <span>Secure campus access</span>
                <span className="secure-label">● Protected</span>
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : isRegister
                  ? 'Create Account'
                  : 'Sign In'}
              <span>→</span>
            </button>

            {message && (
              <p className="form-message" role="alert">
                {message}
              </p>
            )}
          </form>

          {role === 'student' && (
            <div className="register-option">
              {isRegister
                ? 'Already have an account?'
                : "Don't have an account?"}

              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setMessage('');
                }}
              >
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          )}

          <p className="login-bottom">
            Need help? Contact your campus administrator.
          </p>
        </div>
      </section>
    </div>
  );
}

export default App;
