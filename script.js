const users = {
    mjmj: { role: 'مدير', permissions: ['submit', 'edit', 'delete', 'view', 'export'] },
    slm: { role: 'المشرف المنفّذ', permissions: ['submit'] },
    maz: { role: 'مشاهد', permissions: ['view'] },
    fah: { role: 'مُدخل', permissions: ['submit', 'view'] }
};

let currentUser = null;
let expenses = [];

loadExpenses();

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
        alert('ليس لديك صلاحية لإضافة مصروفات');
        return;
    }

    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const tax = parseFloat(document.getElementById('tax').value) || 0;
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;

    if (description && !isNaN(amount) && date) {
        const totalAmount = type === 'outgoing' ? amount + tax : amount;
        expenses.push({ description, amount: totalAmount, originalAmount: amount, tax, type, date });
        saveExpenses();
        updateUI();
        clearForm();
    } else {
        alert('الرجاء إدخال جميع البيانات المطلوبة');
    }
}

function editExpense(index) {
    if (!currentUser || !currentUser.permissions.includes('edit')) {
        alert('ليس لديك صلاحية لتعديل المصروفات');
        return;
    }

    const expense = expenses[index];
    const newDescription = prompt('أدخل الوصف الجديد:', expense.description);
    const newAmount = parseFloat(prompt('أدخل المبلغ الجديد:', expense.originalAmount));
    const newTax = parseFloat(prompt('أدخل الضريبة الجديدة:', expense.tax || 0));
    const newType = prompt('أدخل النوع الجديد (وارد/صادر):', expense.type === 'ingoing' ? 'وارد' : 'صادر');
    const newDate = prompt('أدخل التاريخ الجديد (YYYY-MM-DD):', expense.date);

    if (newDescription && !isNaN(newAmount) && !isNaN(newTax) && (newType === 'وارد' || newType === 'صادر') && newDate) {
        const newTotalAmount = newType === 'صادر' ? newAmount + newTax : newAmount;
        expenses[index] = { 
            description: newDescription, 
            amount: newTotalAmount,
            originalAmount: newAmount,
            tax: newTax,
            type: newType === 'وارد' ? 'ingoing' : 'outgoing',
            date: newDate
        };
        saveExpenses();
        updateUI();
    } else {
        alert('إدخال غير صالح. لم يتم تحديث المصروف.');
    }
}

function deleteExpense(index) {
    if (!currentUser || !currentUser.permissions.includes('delete')) {
        alert('ليس لديك صلاحية لحذف المصروفات');
        return;
    }

    if (confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف؟')) {
        expenses.splice(index, 1);
        saveExpenses();
        updateUI();
    }
}

function updateUI() {
    const tableBody = document.querySelector('#expenseTable tbody');
    tableBody.innerHTML = '';

    let totalIngoing = 0;
    let totalOutgoing = 0;

    expenses.forEach((expense, index) => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = expense.description;
        const amountCell = row.insertCell(1);
        amountCell.textContent = `${Math.abs(expense.amount).toFixed(2)} ر.س`;
        if (expense.tax > 0) {
            amountCell.textContent += ` (شامل الضريبة: ${expense.tax.toFixed(2)} ر.س)`;
        }
        amountCell.className = expense.type === 'ingoing' ? 'ingoing' : 'outgoing';
        if (expense.type === 'outgoing') {
            amountCell.textContent = '- ' + amountCell.textContent;
        }
        row.insertCell(2).textContent = expense.type === 'ingoing' ? 'وارد' : 'صادر';
        row.insertCell(3).textContent = expense.date;

        const actionsCell = row.insertCell(4);
        if (currentUser && currentUser.permissions.includes('edit')) {
            const editButton = document.createElement('button');
            editButton.textContent = 'تعديل';
            editButton.onclick = () => editExpense(index);
            actionsCell.appendChild(editButton);
        }
        if (currentUser && currentUser.permissions.includes('delete')) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'حذف';
            deleteButton.onclick = () => deleteExpense(index);
            actionsCell.appendChild(deleteButton);
        }

        if (expense.type === 'ingoing') {
            totalIngoing += expense.amount;
        } else {
            totalOutgoing += expense.amount;
        }
    });

    const remaining = totalIngoing - totalOutgoing;
    document.getElementById('remaining').innerHTML = `المتبقي: ${remaining.toFixed(2)} ر.س`;
    document.getElementById('totals').innerHTML = `
        إجمالي الوارد: ${totalIngoing.toFixed(2)} ر.س<br>
        إجمالي الصادر: ${totalOutgoing.toFixed(2)} ر.س
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
    document.getElementById('type').value = 'ingoing';
    document.getElementById('date').value = '';
}

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function loadExpenses() {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
    }
}

function exportExpenses() {
    if (!currentUser || !currentUser.permissions.includes('export')) {
        alert('ليس لديك صلاحية لتصدير التقارير');
        return;
    }

    const BOM = "\uFEFF";
    let csvContent = BOM + "الوصف,المبلغ الأصلي,الضريبة,المبلغ الإجمالي,النوع,التاريخ\n";

    expenses.forEach(expense => {
        let row = [
            `"${expense.description}"`,
            expense.originalAmount,
            expense.tax || 0,
            expense.amount,
            expense.type === 'ingoing' ? 'وارد' : 'صادر',
            expense.date
        ].join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "expenses_report.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Only update UI on page load if there are expenses to show
if (expenses.length > 0) {
    updateUI();
}