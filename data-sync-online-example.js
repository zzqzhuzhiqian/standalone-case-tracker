// 数据同步模块（线上版本示例）- 将localStorage改为API调用

// API基础URL
const API_BASE_URL = 'https://your-backend-api.com/api';

// 数据模型定义
const DATA_MODELS = {
    CASE_DATABASE: 'caseDatabase',
    APPOINTMENTS: 'appointments', 
    BOOKED_SLOTS: 'bookedSlots'
};

// 事件监听器存储
const eventListeners = {};

// 初始化数据
function initializeData() {
    // 线上版本不需要初始化localStorage数据
    // 数据将从后端API获取
    console.log('数据同步模块已初始化（线上版本）');
}

// API请求函数封装
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                // 可以在这里添加认证信息
                // 'Authorization': `Bearer ${getToken()}`
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API请求错误 [${endpoint}]:`, error);
        // 如果API请求失败，可以考虑使用本地存储作为备份
        // 这里为简化示例，直接返回null
        return null;
    }
}

// 获取数据（从API）
async function getData(modelName) {
    return await apiRequest(modelName);
}

// 设置数据（发送到API）
async function setData(modelName, data) {
    const result = await apiRequest(modelName, 'POST', data);
    // 触发数据更新事件
    triggerDataChange(modelName, data);
    return result;
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

// 案件管理函数（使用API）
const CaseManager = {
    // 获取所有案件
    async getAllCases() {
        return await getData('cases') || [];
    },
    
    // 添加新案件
    async addCase(caseData) {
        try {
            const result = await apiRequest('cases', 'POST', caseData);
            // 触发数据更新
            const allCases = await this.getAllCases();
            triggerDataChange(DATA_MODELS.CASE_DATABASE, allCases);
            return result;
        } catch (error) {
            console.error('添加案件失败:', error);
            return null;
        }
    },
    
    // 更新案件状态
    async updateCaseStatus(id, newStatus) {
        try {
            const result = await apiRequest(`cases/${id}`, 'PUT', { status: newStatus });
            // 触发数据更新
            const allCases = await this.getAllCases();
            triggerDataChange(DATA_MODELS.CASE_DATABASE, allCases);
            return result;
        } catch (error) {
            console.error('更新案件状态失败:', error);
            return null;
        }
    },
    
    // 删除案件，同时级联删除相关的预约记录
    async deleteCase(id) {
        try {
            // 先获取案件信息，以便找到相关的预约
            const caseData = await apiRequest(`cases/${id}`);
            
            if (caseData) {
                // 查找并取消与该案件相关的预约记录
                if (caseData.name && caseData.phone) {
                    const appointments = await AppointmentManager.getAllAppointments();
                    const relatedAppointment = appointments.find(app => 
                        app.name === caseData.name && app.phone === caseData.phone && app.status !== 'cancelled'
                    );
                    
                    if (relatedAppointment) {
                        await AppointmentManager.cancelAppointment(relatedAppointment.id);
                    }
                }
            }
            
            // 删除案件
            const result = await apiRequest(`cases/${id}`, 'DELETE');
            
            // 触发数据更新
            const allCases = await this.getAllCases();
            triggerDataChange(DATA_MODELS.CASE_DATABASE, allCases);
            
            return result;
        } catch (error) {
            console.error('删除案件失败:', error);
            return null;
        }
    },
    
    // 通过姓名和电话查询案件
    async findCaseByNameAndPhone(name, phone) {
        try {
            const result = await apiRequest(`cases/search?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`);
            return result || null;
        } catch (error) {
            console.error('查询案件失败:', error);
            return null;
        }
    },
    
    // 搜索案件
    async searchCases(searchTerm) {
        try {
            if (!searchTerm) {
                return await this.getAllCases();
            }
            
            const result = await apiRequest(`cases/search?term=${encodeURIComponent(searchTerm)}`);
            return result || [];
        } catch (error) {
            console.error('搜索案件失败:', error);
            return [];
        }
    }
};

// 预约管理函数（使用API）
const AppointmentManager = {
    // 获取所有预约
    async getAllAppointments() {
        return await getData('appointments') || [];
    },
    
    // 添加新预约
    async addAppointment(appointmentData) {
        try {
            // 确保预约状态被正确设置
            if (!appointmentData.status || !['confirmed', 'cancelled'].includes(appointmentData.status)) {
                appointmentData.status = 'confirmed';
            }
            
            // 检查同一手机号是否已有非取消状态的预约
            const appointments = await this.getAllAppointments();
            const existingAppointment = appointments.find(app => 
                app.phone === appointmentData.phone && app.status !== 'cancelled'
            );
            
            if (existingAppointment) {
                console.warn('该手机号已有有效的预约记录');
                return null; // 返回null表示添加失败
            }
            
            // 调用API添加预约
            const result = await apiRequest('appointments', 'POST', appointmentData);
            
            // 同时更新已预约时段
            if (result) {
                await this.addBookedSlot(appointmentData.date, appointmentData.time);
            }
            
            // 触发数据更新
            const allAppointments = await this.getAllAppointments();
            triggerDataChange(DATA_MODELS.APPOINTMENTS, allAppointments);
            
            return result;
        } catch (error) {
            console.error('添加预约失败:', error);
            return null;
        }
    },
    
    // 取消预约
    async cancelAppointment(id) {
        try {
            // 获取预约信息
            const appointment = await apiRequest(`appointments/${id}`);
            
            if (appointment) {
                // 从已预约时段中移除
                await this.removeBookedSlot(appointment.date, appointment.time);
                
                // 更新预约状态
                const result = await apiRequest(`appointments/${id}`, 'PUT', { status: 'cancelled' });
                
                // 触发数据更新
                const allAppointments = await this.getAllAppointments();
                triggerDataChange(DATA_MODELS.APPOINTMENTS, allAppointments);
                
                return result;
            }
            return null;
        } catch (error) {
            console.error('取消预约失败:', error);
            return null;
        }
    },
    
    // 根据日期获取已预约时段
    async getBookedSlotsByDate(date) {
        try {
            const bookedSlots = await this.getBookedSlots();
            return bookedSlots[date] || [];
        } catch (error) {
            console.error('获取已预约时段失败:', error);
            return [];
        }
    },
    
    // 获取已预约时段
    async getBookedSlots() {
        return await getData('bookedSlots') || {};
    },
    
    // 添加已预约时段
    async addBookedSlot(date, timeSlot) {
        try {
            const bookedSlots = await this.getBookedSlots();
            
            if (!bookedSlots[date]) {
                bookedSlots[date] = [];
            }
            
            if (!bookedSlots[date].includes(timeSlot)) {
                bookedSlots[date].push(timeSlot);
                await setData('bookedSlots', bookedSlots);
            }
        } catch (error) {
            console.error('添加已预约时段失败:', error);
        }
    },
    
    // 移除已预约时段
    async removeBookedSlot(date, timeSlot) {
        try {
            const bookedSlots = await this.getBookedSlots();
            
            if (bookedSlots[date]) {
                const index = bookedSlots[date].indexOf(timeSlot);
                if (index > -1) {
                    bookedSlots[date].splice(index, 1);
                    await setData('bookedSlots', bookedSlots);
                }
            }
        } catch (error) {
            console.error('移除已预约时段失败:', error);
        }
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
    API_BASE_URL: API_BASE_URL,
    // 可以在这里添加设置API地址的方法
    setApiBaseUrl: function(url) {
        window.DataSync.API_BASE_URL = url;
        // 更新内部API请求函数的基础URL
        // 注意：这只是一个示例，实际实现可能需要更复杂的处理
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        window.DataSync.initialize();
    });
}