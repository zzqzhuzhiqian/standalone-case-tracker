// 数据同步模块 - 用于实现前端预约系统和后台管理工具的数据实时共享

// 数据模型定义
const DATA_MODELS = {
    CASE_DATABASE: 'caseDatabase',
    APPOINTMENTS: 'appointments', 
    BOOKED_SLOTS: 'bookedSlots'
};

// 事件监听器存储
const eventListeners = {};

// 初始化数据（如果不存在）
function initializeData() {
    // 初始化案件数据库
    if (!localStorage.getItem(DATA_MODELS.CASE_DATABASE)) {
        const initialCases = [
            { name: '张三', phone: '13800138001', status: 'approved', reason: '' },
            { name: '李四', phone: '13900139002', status: 'rejected', reason: '提交材料不完整，请补充身份证明文件' },
            { name: '王五', phone: '13700137003', status: 'pending', reason: '您的申请正在审核中，请耐心等待' }
        ];
        setData(DATA_MODELS.CASE_DATABASE, initialCases);
    }
    
    // 初始化预约记录
    if (!localStorage.getItem(DATA_MODELS.APPOINTMENTS)) {
        const initialAppointments = [
            { name: '张三', phone: '13800138001', date: '2025-10-16', time: '10:00-11:00', displayDate: '10月16日 (周四)', status: 'confirmed' }
        ];
        setData(DATA_MODELS.APPOINTMENTS, initialAppointments);
    }
    
    // 初始化已预约时段
    if (!localStorage.getItem(DATA_MODELS.BOOKED_SLOTS)) {
        const initialBookedSlots = {
            // 2025年9月
            '2025-09-18': ['09:00-10:00', '15:00-16:00'],
            '2025-09-19': ['09:00-10:00'],
            '2025-09-25': [],
            '2025-09-26': [],
            // 2025年10月
            '2025-10-16': ['10:00-11:00'], // 张三的预约
            '2025-10-17': ['15:00-16:00'],
            '2025-10-23': ['10:00-11:00'],
            '2025-10-24': [],
            // 2025年11月
            '2025-11-13': ['09:00-10:00'],
            '2025-11-14': [],
            '2025-11-20': ['16:00-17:00'],
            '2025-11-21': ['09:00-10:00'],
            // 2025年12月
            '2025-12-11': [],
            '2025-12-12': ['15:00-16:00'],
            '2025-12-18': [],
            '2025-12-19': [],
            // 2026年1月
            '2026-01-08': ['10:00-11:00'],
            '2026-01-09': [],
            '2026-01-15': ['15:00-16:00'],
            '2026-01-16': [],
            // 2027年1月
            '2027-01-07': ['09:00-10:00'],
            '2027-01-08': [],
            '2027-01-14': ['16:00-17:00'],
            '2027-01-15': [],
            // 2028年1月
            '2028-01-06': [],
            '2028-01-07': ['15:00-16:00'],
            '2028-01-13': ['10:00-11:00'],
            '2028-01-14': []
        };
        setData(DATA_MODELS.BOOKED_SLOTS, initialBookedSlots);
    }
}

// 获取数据
function getData(modelName) {
    const data = localStorage.getItem(modelName);
    return data ? JSON.parse(data) : null;
}

// 设置数据
function setData(modelName, data) {
    localStorage.setItem(modelName, JSON.stringify(data));
    // 触发数据更新事件
    triggerDataChange(modelName, data);
}

// 订阅数据更新事件
function subscribeToDataChanges(modelName, callback) {
    if (!eventListeners[modelName]) {
        eventListeners[modelName] = [];
    }
    eventListeners[modelName].push(callback);
}

// 取消订阅
function unsubscribeFromDataChanges(modelName, callback) {
    if (eventListeners[modelName]) {
        const index = eventListeners[modelName].indexOf(callback);
        if (index > -1) {
            eventListeners[modelName].splice(index, 1);
        }
    }
}

// 触发数据更新事件
function triggerDataChange(modelName, data) {
    if (eventListeners[modelName]) {
        eventListeners[modelName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in data change callback:', error);
            }
        });
    }
}

// 案件管理函数
const CaseManager = {
    // 获取所有案件
    getAllCases: function() {
        return getData(DATA_MODELS.CASE_DATABASE) || [];
    },
    
    // 添加新案件
    addCase: function(caseData) {
        const cases = this.getAllCases();
        cases.push(caseData);
        setData(DATA_MODELS.CASE_DATABASE, cases);
        return caseData;
    },
    
    // 更新案件状态
    updateCaseStatus: function(index, newStatus) {
        const cases = this.getAllCases();
        if (index >= 0 && index < cases.length) {
            cases[index].status = newStatus;
            setData(DATA_MODELS.CASE_DATABASE, cases);
            return cases[index];
        }
        return null;
    },
    
    // 删除案件，同时级联删除相关的预约记录
    deleteCase: function(index) {
        const cases = this.getAllCases();
        if (index >= 0 && index < cases.length) {
            const deletedCase = cases.splice(index, 1)[0];
            
            // 查找并取消与该案件相关的预约记录
            if (deletedCase.name && deletedCase.phone) {
                const appointment = AppointmentManager.findAppointmentByNameAndPhone(deletedCase.name, deletedCase.phone);
                if (appointment) {
                    AppointmentManager.cancelAppointment(appointment.name, appointment.phone);
                }
            }
            
            setData(DATA_MODELS.CASE_DATABASE, cases);
            return deletedCase;
        }
        return null;
    },
    
    // 通过姓名和电话查询案件
    findCaseByNameAndPhone: function(name, phone) {
        const cases = this.getAllCases();
        return cases.find(caseItem => caseItem.name === name && caseItem.phone === phone);
    },
    
    // 兼容客户端调用的方法名
    getCaseByNameAndPhone: function(name, phone) {
        return this.findCaseByNameAndPhone(name, phone);
    },
    
    // 搜索案件
    searchCases: function(searchTerm) {
        const cases = this.getAllCases();
        if (!searchTerm) return cases;
        
        searchTerm = searchTerm.toLowerCase().trim();
        return cases.filter(caseItem => 
            caseItem.name.toLowerCase().includes(searchTerm) || 
            caseItem.phone.includes(searchTerm)
        );
    }
};

// 预约管理函数
const AppointmentManager = {
    // 获取所有预约
    getAllAppointments: function() {
        return getData(DATA_MODELS.APPOINTMENTS) || [];
    },
    
    // 添加新预约
    addAppointment: function(appointmentData) {
        const appointments = this.getAllAppointments();
        
        // 确保预约状态被正确设置为'confirmed'
        if (!appointmentData.status || !['confirmed', 'cancelled'].includes(appointmentData.status)) {
            appointmentData.status = 'confirmed';
        }
        
        // 检查同一手机号是否已有非取消状态的预约
        const existingAppointment = appointments.find(app => 
            app.phone === appointmentData.phone && app.status !== 'cancelled'
        );
        
        if (existingAppointment) {
            console.warn('该手机号已有有效的预约记录');
            return null; // 返回null表示添加失败
        }
        
        appointments.push(appointmentData);
        setData(DATA_MODELS.APPOINTMENTS, appointments);
        
        // 同时更新已预约时段
        this.addBookedSlot(appointmentData.date, appointmentData.time);
        
        return appointmentData;
    },
    
    // 取消预约 - 支持索引或姓名+电话两种方式
    cancelAppointment: function(param1, param2) {
        const appointments = this.getAllAppointments();
        let appointmentIndex = -1;
        
        // 如果param1是数字，认为是索引
        if (typeof param1 === 'number') {
            appointmentIndex = param1;
        } 
        // 否则认为是姓名和电话
        else if (typeof param1 === 'string' && typeof param2 === 'string') {
            appointmentIndex = appointments.findIndex(app => app.name === param1 && app.phone === param2);
        }
        
        if (appointmentIndex >= 0 && appointmentIndex < appointments.length) {
            const appointment = appointments[appointmentIndex];
            // 从已预约时段中移除
            this.removeBookedSlot(appointment.date, appointment.time);
            
            // 更新预约状态
            appointment.status = 'cancelled';
            setData(DATA_MODELS.APPOINTMENTS, appointments);
            return appointment;
        }
        return null;
    },
    
    // 通过姓名和电话查询预约（只返回非取消状态的预约）
    findAppointmentByNameAndPhone: function(name, phone) {
        const appointments = this.getAllAppointments();
        return appointments.find(app => app.name === name && app.phone === phone && app.status !== 'cancelled');
    },
    
    // 兼容客户端调用的方法名
    getAppointmentByUser: function(name, phone) {
        return this.findAppointmentByNameAndPhone(name, phone);
    },
    
    // 根据日期获取已预约时段
    getBookedSlotsByDate: function(date) {
        const bookedSlots = this.getBookedSlots();
        return bookedSlots[date] || [];
    },
    
    // 获取已预约时段
    getBookedSlots: function() {
        return getData(DATA_MODELS.BOOKED_SLOTS) || {};
    },
    
    // 添加已预约时段
    addBookedSlot: function(date, timeSlot) {
        const bookedSlots = this.getBookedSlots();
        if (!bookedSlots[date]) {
            bookedSlots[date] = [];
        }
        if (!bookedSlots[date].includes(timeSlot)) {
            bookedSlots[date].push(timeSlot);
            setData(DATA_MODELS.BOOKED_SLOTS, bookedSlots);
        }
    },
    
    // 移除已预约时段
    removeBookedSlot: function(date, timeSlot) {
        const bookedSlots = this.getBookedSlots();
        if (bookedSlots[date]) {
            const index = bookedSlots[date].indexOf(timeSlot);
            if (index > -1) {
                bookedSlots[date].splice(index, 1);
                setData(DATA_MODELS.BOOKED_SLOTS, bookedSlots);
            }
        }
    },
    
    // 检查某个时段是否已被预约
    isSlotBooked: function(date, timeSlot) {
        const bookedSlots = this.getBookedSlots();
        return bookedSlots[date] && bookedSlots[date].includes(timeSlot);
    }
};

// 数据统计函数
const DataStatistics = {
    // 获取总预约数
    getTotalAppointments: function() {
        return AppointmentManager.getAllAppointments().length;
    },
    
    // 获取审核通过的案件数
    getApprovedCasesCount: function() {
        const cases = CaseManager.getAllCases();
        return cases.filter(c => c.status === 'approved').length;
    },
    
    // 获取待处理的案件数
    getPendingCasesCount: function() {
        const cases = CaseManager.getAllCases();
        return cases.filter(c => c.status === 'pending').length;
    }
};

// 导出模块接口
window.DataSync = {
    initialize: initializeData,
    init: initializeData, // 兼容init方法调用
    subscribe: subscribeToDataChanges,
    unsubscribe: unsubscribeFromDataChanges,
    CaseManager: CaseManager,
    AppointmentManager: AppointmentManager,
    DataStatistics: DataStatistics,
    DATA_MODELS: DATA_MODELS
};

// 自动初始化数据
initializeData();