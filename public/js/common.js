// API基础URL
const API_BASE_URL = 'http://localhost:3000/api';

// 通用请求函数
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '请求失败');
        }
        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 加载年份选项
async function loadYears(selectId) {
    try {
        const years = await fetchAPI('/years');
        const selectElement = document.getElementById(selectId);
        
        if (selectElement) {
            selectElement.innerHTML = '';
            
            if (years.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '无数据';
                selectElement.appendChild(option);
                return false;
            }
            
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                selectElement.appendChild(option);
            });
            
            return years.length > 0 ? years[0] : null;
        }
        return null;
    } catch (error) {
        console.error('加载年份失败:', error);
        return null;
    }
}

// 加载学院选项
async function loadColleges(selectId, year) {
    try {
        const colleges = await fetchAPI(`/colleges?year=${year}`);
        const selectElement = document.getElementById(selectId);
        
        if (selectElement) {
            selectElement.innerHTML = '';
            
            if (colleges.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '无数据';
                selectElement.appendChild(option);
                return false;
            }
            
            colleges.forEach(college => {
                const option = document.createElement('option');
                option.value = college;
                option.textContent = college;
                selectElement.appendChild(option);
            });
            
            return colleges.length > 0 ? colleges[0] : null;
        }
        return null;
    } catch (error) {
        console.error('加载学院失败:', error);
        return null;
    }
}

// 加载班级选项
async function loadClasses(selectId, year, college) {
    try {
        const classes = await fetchAPI(`/classes?year=${year}&college=${encodeURIComponent(college)}`);
        const selectElement = document.getElementById(selectId);
        
        if (selectElement) {
            selectElement.innerHTML = '';
            
            if (classes.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '无数据';
                selectElement.appendChild(option);
                return false;
            }
            
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                selectElement.appendChild(option);
            });
            
            return classes.length > 0 ? classes[0] : null;
        }
        return null;
    } catch (error) {
        console.error('加载班级失败:', error);
        return null;
    }
}

// 格式化百分比
function formatPercent(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0.0%';
    return (value * 100).toFixed(1) + '%';
}

// 计算合格率
function calculatePassRate(passed, total) {
    // 合格标准: 各项目分数 >= 50分 视为合格
    if (!total) return 0;
    // 确保数值有效
    passed = parseInt(passed) || 0;
    total = parseInt(total) || 1;
    
    // 约束合格率范围不小于 0 且不大于 1
    const rate = Math.min(Math.max(passed / total, 0), 1);
    return rate;
}

// 雷达图配置生成函数
function generateRadarChartOption(data, title, legendData) {
    const indicators = [
        { name: '体重身高', max: 100 },
        { name: '肺活量', max: 100 },
        { name: '50米跑', max: 100 },
        { name: '立定跳远', max: 100 },
        { name: '坐位体前屈', max: 100 },
        { name: '长跑', max: 100 },
        { name: '力量', max: 100 }
    ];
    
    return {
        title: {
            text: title || '体测成绩雷达图',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'item'
        },
        legend: {
            data: legendData || ['平均分'],
            bottom: 10,
            left: 'center'
        },
        radar: {
            indicator: indicators,
            shape: 'polygon',
            splitNumber: 5,
            center: ['50%', '55%'],
            radius: '65%'
        },
        series: [{
            type: 'radar',
            lineStyle: {
                width: 2
            },
            data: data
        }]
    };
}

// 矩形树图配置生成函数
function generateTreemapOption(data, title) {
    return {
        title: {
            text: title || '矩形树图',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            formatter: function(info) {
                const { name, value, passRate } = info.data;
                let tooltip = `<div style="font-weight:bold;margin-bottom:5px;">${name}</div>`;
                tooltip += `<div>总人数: ${value}</div>`;
                if (passRate !== undefined) {
                    tooltip += `<div>合格率: ${formatPercent(passRate)}</div>`;
                }
                return tooltip;
            }
        },
        series: [{
            type: 'treemap',
            data: data,
            label: {
                show: true,
                formatter: '{b}\n{c}人\n合格率: {d}%',
                rich: {
                    b: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        height: 20
                    },
                    c: {
                        fontSize: 12,
                        height: 20
                    },
                    d: {
                        fontSize: 12,
                        height: 20
                    }
                }
            },
            breadcrumb: {
                show: false
            },
            levels: [{
                itemStyle: {
                    borderWidth: 2,
                    borderColor: '#fff',
                    gapWidth: 2
                }
            }],
            visualMap: {
                type: 'continuous',
                min: 0,
                max: 1,
                inRange: {
                    color: ['#e74c3c', '#e67e22', '#f1c40f', '#7dcea0', '#27ae60']
                },
                calculable: true,
                realtime: false
            }
        }]
    };
}

// 盒须图配置生成函数
function generateBoxplotOption(data, names, title) {
    return {
        title: {
            text: title || '各项目成绩分布',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'item',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                const { name, data } = params;
                if (data && Array.isArray(data) && data.length === 5) {
                    return `${name}<br/>
                        最小值: ${data[0].toFixed(2)}<br/>
                        下四分位: ${data[1].toFixed(2)}<br/>
                        中位数: ${data[2].toFixed(2)}<br/>
                        上四分位: ${data[3].toFixed(2)}<br/>
                        最大值: ${data[4].toFixed(2)}`;
                }
                return name;
            }
        },
        grid: {
            left: '10%',
            right: '10%',
            bottom: '15%'
        },
        xAxis: {
            type: 'category',
            data: names,
            boundaryGap: true,
            nameGap: 30,
            splitArea: {
                show: false
            },
            axisLabel: {
                margin: 20,
                rotate: names.some(name => name.length > 4) ? 45 : 0,
                interval: 0,
                formatter: function(value) {
                    if (value.length > 6) {
                        return value.substring(0, 6) + '...';
                    }
                    return value;
                }
            },
            splitLine: {
                show: false
            }
        },
        yAxis: {
            type: 'value',
            name: '分数',
            min: 0,
            max: 100,
            splitArea: {
                show: true
            }
        },
        series: [{
            name: '成绩分布',
            type: 'boxplot',
            datasetIndex: 0,
            data: data,
            itemStyle: {
                borderWidth: 1.5,
                borderColor: '#3498db'
            },
            boxWidth: ['40%', '40%'],
            emphasis: {
                itemStyle: {
                    borderWidth: 2,
                    borderColor: '#2980b9'
                }
            }
        }]
    };
}

// 柱状图配置生成函数
function generateBarChartOption(data, title) {
    return {
        title: {
            text: title || '比较数据',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: data.map(item => item.name),
            bottom: 10
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['体重身高', '肺活量', '50米跑', '立定跳远', '坐位体前屈', '长跑', '力量', '总分']
        },
        yAxis: {
            type: 'value',
            name: '分数',
            min: 0,
            max: 100
        },
        series: data.map(item => ({
            name: item.name,
            type: 'bar',
            data: item.data,
            emphasis: {
                focus: 'series'
            }
        }))
    };
}

// 生成折线图配置
function generateLineChartOption(data, categories, title, yAxisName) {
    return {
        title: {
            text: title || '趋势分析',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: data.map(item => item.name),
            bottom: 10
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: categories,
            boundaryGap: false
        },
        yAxis: {
            type: 'value',
            name: yAxisName || '数值',
            min: yAxisName === '合格率' ? 0 : undefined,
            max: yAxisName === '合格率' ? 1 : undefined,
            axisLabel: {
                formatter: yAxisName === '合格率' ? '{value}%' : '{value}'
            }
        },
        series: data.map(item => ({
            name: item.name,
            type: 'line',
            data: item.data,
            symbolSize: 8,
            emphasis: {
                focus: 'series'
            }
        }))
    };
}

// 处理盒须图数据
function prepareBoxplotData(scores, field) {
    // 过滤掉null和undefined
    const validScores = scores.filter(s => s[field] !== null && s[field] !== undefined)
        .map(s => s[field]);
    
    if (validScores.length === 0) return [0, 0, 0, 0, 0];
    
    // 排序
    validScores.sort((a, b) => a - b);
    
    // 计算统计量
    const min = validScores[0];
    const max = validScores[validScores.length - 1];
    
    const q1Index = Math.floor(validScores.length * 0.25);
    const q2Index = Math.floor(validScores.length * 0.5);
    const q3Index = Math.floor(validScores.length * 0.75);
    
    const q1 = validScores[q1Index];
    const q2 = validScores[q2Index];
    const q3 = validScores[q3Index];
    
    return [min, q1, q2, q3, max];
}

// 初始化图表实例
function initChart(elementId) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) {
        console.error(`找不到ID为${elementId}的DOM元素`);
        return null;
    }
    return echarts.init(chartDom);
} 