import { ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const users = {
    mjmj: { role: 'مدير', permissions: ['submit', 'edit', 'delete', 'view', 'export'] },
    slm: { role: 'المشرف المنفّذ', permissions: ['submit'] },
    maz: { role: 'مشاهد', permissions: ['view'] },
    fah: { role: 'مُدخل', permissions: ['submit', 'view'] }
};

let currentUser = null;
let expenses = [];
let expensesRef;

function initializeFirebase() {
    expensesRef = ref(window.database, 'expenses');
    loadExpenses();
}

function loadExpenses() {
    onValue(expensesRef, (snapshot) => {
        expenses = [];
        snapshot.forEach((childSnapshot) => {
            expenses.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        updateUI();
    });
}

function login() {
    const username = document.getElementById('username').value;
    if (users[username]) {
        currentUser = { ...users[username], username };
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('userRole').textContent = `${currentUser.username} (${currentUser.role})`;
        document.getElementById('exportButton').classList.toggle('hidden', !currentUser.permissions.includes('export'));
        updateUI();
    } else {
        alert('اسم مستخدم غير صالح');
    }
}

function submitExpense() {
    if (!currentUser || !currentUser.permissions.includes('submit')) {
        alert('ليس لديك صلاحية لإضافة قيود');
        return;
    }

    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const tax = parseFloat(document.getElementById('tax').value) || 0;
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;

    if (description && !isNaN(amount) && date) {
        const totalAmount = type === 'مصروف' ? amount + tax : amount;
        const newExpense = { 
            description, 
            amount: totalAmount, 
            originalAmount: amount, 
            tax, 
            type, 
            date,
            addedBy: currentUser.username
        };
        push(expensesRef, newExpense);
        clearForm();
    } else {
        alert('الرجاء إدخال جميع البيانات المطلوبة');
    }
}

function editExpense(id) {
    if (!currentUser || !currentUser.permissions.includes('edit')) {
        alert('ليس لديك صلاحية لتعديل القيود');
        return;
    }

    const expense = expenses.find(e => e.id === id);
    const newDescription = prompt('أدخل الوصف الجديد:', expense.description);
    const newAmount = parseFloat(prompt('أدخل المبلغ الجديد:', expense.originalAmount));
    const newTax = parseFloat(prompt('أدخل الضريبة الجديدة (اختياري):', expense.tax || 0));
    const newType = prompt('أدخل النوع الجديد (ايداع/مصروف):', expense.type);
    const newDate = prompt('أدخل التاريخ الجديد (YYYY-MM-DD):', expense.date);

    if (newDescription && !isNaN(newAmount) && (newType === 'ايداع' || newType === 'مصروف') && newDate) {
        const newTotalAmount = newType === 'مصروف' ? newAmount + (isNaN(newTax) ? 0 : newTax) : newAmount;
        const updatedExpense = { 
            description: newDescription, 
            amount: newTotalAmount,
            originalAmount: newAmount,
            tax: isNaN(newTax) ? 0 : newTax,
            type: newType,
            date: newDate,
            addedBy: expense.addedBy
        };
        update(ref(window.database, `expenses/${id}`), updatedExpense);
    } else {
        alert('إدخال غير صالح. لم يتم تحديث القيد.');
    }
}

function deleteExpense(id) {
    if (!currentUser || !currentUser.permissions.includes('delete')) {
        alert('ليس لديك صلاحية لحذف القيود');
        return;
    }

    if (confirm('هل أنت متأكد من رغبتك في حذف هذا القيد؟')) {
        remove(ref(window.database, `expenses/${id}`));
    }
}

function updateUI() {
    const tableBody = document.querySelector('#expenseTable tbody');
    tableBody.innerHTML = '';

    let totalDeposits = 0;
    let totalExpenses = 0;

    expenses.forEach((expense) => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = expense.description;
        const amountCell = row.insertCell(1);
        const amount = Math.abs(expense.amount).toFixed(2);
        amountCell.innerHTML = `<span class="${expense.type === 'ايداع' ? 'ingoing' : 'outgoing'}">${expense.type === 'ايداع' ? '' : '-'} ${amount} ر.س</span>`;
        if (expense.tax > 0) {
            amountCell.innerHTML += ` <span class="tax">(شامل الضريبة: ${expense.tax.toFixed(2)} ر.س)</span>`;
        }
        row.insertCell(2).textContent = expense.type;
        row.insertCell(3).textContent = expense.date;
        row.insertCell(4).textContent = expense.addedBy;

        const actionsCell = row.insertCell(5);
        if (currentUser && currentUser.permissions.includes('edit')) {
            const editButton = document.createElement('button');
            editButton.textContent = 'تعديل';
            editButton.onclick = () => editExpense(expense.id);
            actionsCell.appendChild(editButton);
        }
        if (currentUser && currentUser.permissions.includes('delete')) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'حذف';
            deleteButton.onclick = () => deleteExpense(expense.id);
            actionsCell.appendChild(deleteButton);
        }

        if (expense.type === 'ايداع') {
            totalDeposits += expense.amount;
        } else {
            totalExpenses += expense.amount;
        }
    });

    const remaining = totalDeposits - totalExpenses;
    document.getElementById('remaining').innerHTML = `المتبقي: ${remaining.toFixed(2)} ر.س`;
    document.getElementById('totals').innerHTML = `
        إجمالي الايداعات: ${totalDeposits.toFixed(2)} ر.س<br>
        إجمالي المصروفات: ${totalExpenses.toFixed(2)} ر.س
    `;

    if (currentUser) {
        document.getElementById('expenseForm').style.display = 
            currentUser.permissions.includes('submit') ? 'block' : 'none';
        document.getElementById('exportButton').style.display = 
            currentUser.permissions.includes('export') ? 'block' : 'none';
    } else {
        document.getElementById('expenseForm').style.display = 'none';
        document.getElementById('exportButton').style.display = 'none';
    }
}

function clearForm() {
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('tax').value = '';
    document.getElementById('type').value = 'مصروف';
    document.getElementById('date').value = '';
}

function exportExpenses() {
    if (!currentUser || !currentUser.permissions.includes('export')) {
        alert('ليس لديك صلاحية لتصدير التقارير');
        return;
    }

    const BOM = "\uFEFF";
    let csvContent = BOM + "الوصف,المبلغ الأصلي,الضريبة,المبلغ الإجمالي,النوع,التاريخ,أضيف بواسطة\n";

    expenses.forEach(expense => {
        let row = [
            `"${expense.description}"`,
            expense.originalAmount,
            expense.tax || 0,
            expense.amount,
            expense.type,
            expense.date,
            expense.addedBy
        ].join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "تقرير_القيود.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize Firebase and load expenses when the page loads
window.onload = initializeFirebase;

// Make functions globally accessible
window.login = login;
window.submitExpense = submitExpense;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.exportExpenses = exportExpenses;
