import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import './App.css';

function generateUUID() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const firebaseConfig = {
  apiKey: "AIzaSyANTxE2KcHTTA3eHbnm2KwWQrUNrdaIPv4",
  authDomain: "expense-tracker-3f7cc.firebaseapp.com",
  projectId: "expense-tracker-3f7cc",
  storageBucket: "expense-tracker-3f7cc.appspot.com",
  messagingSenderId: "117322473858",
  appId: "1:117322473858:web:2273cabe0a8fb8d800ef9b",
  measurementId: "G-T3X4GT88ZL"
};

const appId = "expense-tracker-3f7cc";

const App = () => {
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [userId, setUserId] = useState('Loading user...');
  const [expensesCollectionRef, setExpensesCollectionRef] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [submitButtonText, setSubmitButtonText] = useState('Add Expense');
  const [submitButtonClass, setSubmitButtonClass] = useState('bg-blue-500 hover:bg-blue-600');
  const [budget, setBudget] = useState(1000);

  const categoryColors = {
    Food: 'bg-blue-200 text-blue-900',
    Transport: 'bg-blue-300 text-blue-900',
    Housing: 'bg-yellow-100 text-yellow-900',
    Entertainment: 'bg-purple-100 text-purple-900',
    Utilities: 'bg-red-100 text-red-900',
    Shopping: 'bg-pink-100 text-pink-900',
    Health: 'bg-teal-100 text-teal-900',
    Education: 'bg-indigo-100 text-indigo-900',
    Other: 'bg-gray-100 text-gray-900',
  };

  const showMessage = (text) => {
    setModalMessage(text);
    setIsModalOpen(true);
  };

  const nhandleModalClose = () => setIsModalOpen(false);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const firebaseApp = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(firebaseApp);
        const firebaseAuth = getAuth(firebaseApp);
        await signInAnonymously(firebaseAuth);
        onAuthStateChanged(firebaseAuth, (user) => {
          const currentUserId = user?.uid || generateUUID();
          setUserId(`User ID: ${currentUserId}`);
          const ref = collection(firestoreDb, `artifacts/${appId}/users/${currentUserId}/expenses`);
          setExpensesCollectionRef(ref);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Firebase error:", err.message);
        showMessage("Failed to initialize Firebase.");
        setIsLoading(false);
      }
    };
    initializeFirebase();
    const today = new Date();
    setExpenseDate(`${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    if (!expensesCollectionRef) return;
    const unsubscribe = onSnapshot(expensesCollectionRef, (snapshot) => {
      const data = [];
      let total = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({ id: doc.id, ...d });
        total += typeof d.amount === 'number' ? d.amount : 0;
      });
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date) || (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
      setExpenses(sorted);
      setTotalAmount(total);
    }, (err) => {
      showMessage(`Failed to load expenses: ${err.message}`);
    });
    return () => unsubscribe();
  }, [expensesCollectionRef]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !expensesCollectionRef) {
      showMessage("App not ready.");
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (!expenseName || isNaN(amount) || amount <= 0 || !expenseCategory || !expenseDate) {
      showMessage("All fields are required and amount must be positive.");
      return;
    }
    try {
      const data = { name: expenseName.trim(), amount, category: expenseCategory, date: expenseDate };
      if (editingExpenseId) {
        await updateDoc(doc(expensesCollectionRef, editingExpenseId), data);
        showMessage("Expense updated.");
        setEditingExpenseId(null);
        setSubmitButtonText('Add Expense');
        setSubmitButtonClass('bg-blue-500 hover:bg-blue-600');
      } else {
        await addDoc(expensesCollectionRef, { ...data, timestamp: Timestamp.now() });
        showMessage("Expense added.");
      }
      setExpenseName('');
      setExpenseAmount('');
      setExpenseCategory('');
      const today = new Date();
      setExpenseDate(`${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`);
    } catch (err) {
      showMessage(`Failed to save expense: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(expensesCollectionRef, id));
      showMessage("Expense deleted.");
    } catch (err) {
      showMessage(`Failed to delete: ${err.message}`);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseName(expense.name);
    setExpenseAmount(expense.amount.toString());
    setExpenseCategory(expense.category);
    setExpenseDate(expense.date);
    setSubmitButtonText('Update Expense');
    setSubmitButtonClass('bg-green-500 hover:bg-green-600');
  };

  if (modalMessage && !isModalOpen) {
    return (
      <div className="min-h-screen bg-blue-100 flex justify-end px-8 sm:px-10 md:px-12">
        <div className="flex-1"></div>
        <div className="animate-fade-in bg-white p-5 sm:p-6 card w-full max-w-[85vw] sm:max-w-[360px] md:max-w-[480px] lg:max-w-[560px] border border-blue-300">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 text-center">Expense Tracker</h1>
          <p className="text-red-600 text-sm sm:text-base text-center">Error: {modalMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 flex justify-end px-8 sm:px-10 md:px-12">
      <div className="flex-1"></div>
      <div className="animate-fade-in bg-white p-5 sm:p-6 md:p-8 card w-full max-w-[85vw] sm:max-w-[360px] md:max-w-[480px] lg:max-w-[560px] border border-blue-300">
        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">Expense Tracker</h1>
        <div className="text-center text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 bg-gray-100 p-2 rounded-lg break-all">
          {isLoading ? "Initializing..." : userId}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:gap-6 mb-6 sm:mb-8">
          <input
            type="text"
            placeholder="Name"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            className="p-3 border border-blue-300 rounded-md text-xs sm:text-sm md:text-base transition-all duration-200 hover:border-blue-400"
            required
            disabled={isLoading}
          />
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            className="p-3 border border-blue-300 rounded-md text-xs sm:text-sm md:text-base transition-all duration-200 hover:border-blue-400"
            required
            disabled={isLoading}
          />
          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            className="p-3 border border-blue-300 rounded-md text-xs sm:text-sm md:text-base transition-all duration-200 hover:border-blue-400"
            required
            disabled={isLoading}
          >
            <option value="">Select Category</option>
            <option>Food</option>
            <option>Transport</option>
            <option>Housing</option>
            <option>Entertainment</option>
            <option>Utilities</option>
            <option>Shopping</option>
            <option>Health</option>
            <option>Education</option>
            <option>Other</option>
          </select>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="p-3 border border-blue-300 rounded-md text-xs sm:text-sm md:text-base transition-all duration-200 hover:border-blue-400"
            required
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`text-white font-semibold py-2 sm:py-3 rounded-lg text-xs sm:text-sm md:text-base ${submitButtonClass} transition-all duration-200 hover:scale-105`}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : submitButtonText}
          </button>
        </form>
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg shadow-inner mb-4 sm:mb-6 text-center">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">Total</h2>
          <p className="text-base sm:text-lg md:text-xl font-bold text-blue-700">${totalAmount.toFixed(2)}</p>
          <div className="mt-3 sm:mt-4">
            <label htmlFor="budget" className="text-xs sm:text-sm md:text-base font-medium text-gray-700">Monthly Budget: </label>
            <input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
              className="p-2 border border-blue-300 rounded-md text-xs sm:text-sm md:text-base w-20 sm:w-24 transition-all duration-200 hover:border-blue-400"
              min="0"
              step="0.01"
            />
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
              <div
                className="bg-blue-500 h-2 sm:h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${budget > 0 ? Math.min((totalAmount / budget) * 100, 100) : 0}%` }}
              ></div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
              {budget > 0 ? `${((totalAmount / budget) * 100).toFixed(1)}% of budget used` : 'Set a budget'}
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Expense List</h2>
          <div className="overflow-x-auto max-h-60 sm:max-h-80 md:max-h-96 rounded-lg border border-blue-300 min-w-0">
            <table className="min-w-full divide-y divide-blue-300">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 sm:px-5 py-2 text-left text-xs sm:text-sm font-medium text-gray-600 min-w-[50px] sm:min-w-[70px]">Name</th>
                  <th className="px-4 sm:px-5 py-2 text-left text-xs sm:text-sm font-medium text-gray-600 min-w-[30px] sm:min-w-[50px]">Amount</th>
                  <th className="px-4 sm:px-5 py-2 text-left text-xs sm:text-sm font-medium text-gray-600 min-w-[50px] sm:min-w-[70px]">Category</th>
                  <th className="px-4 sm:px-5 py-2 text-left text-xs sm:text-sm font-medium text-gray-600 min-w-[50px] sm:min-w-[70px]">Date</th>
                  <th className="px-4 sm:px-5 py-2 text-left text-xs sm:text-sm font-medium text-gray-600 min-w-[70px] sm:min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-300">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500 text-xs sm:text-sm">Loading expenses...</td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500 text-xs sm:text-sm">No expenses added.</td>
                  </tr>
                ) : (
                  expenses.map((exp, index) => (
                    <tr
                      key={exp.id}
                      className="transition-all duration-200 hover:bg-gray-50 sm:animate-slide-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-4 sm:px-5 py-2 text-xs sm:text-sm">{exp.name}</td>
                      <td className="px-4 sm:px-5 py-2 text-xs sm:text-sm">${exp.amount.toFixed(2)}</td>
                      <td className="px-4 sm:px-5 py-2 text-xs sm:text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs sm:text-sm ${categoryColors[exp.category] || categoryColors.Other}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-2 text-xs sm:text-sm">{exp.date}</td>
                      <td className="px-4 sm:px-5 py-2 text-xs sm:text-sm">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="text-blue-500 hover:underline mr-2 transition-all duration-200 hover:scale-110"
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="text-red-600 hover:underline transition-all duration-200 hover:scale-110"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="sm:animate-modal-pop bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-[80vw] sm:max-w-[360px] text-center border border-blue-300 card">
              <p className="text-xs sm:text-sm md:text-base font-medium text-gray-900 mb-3 sm:mb-4">{modalMessage}</p>
              <button
                onClick={handleModalClose}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm md:text-base transition-all duration-200 hover:scale-105"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;