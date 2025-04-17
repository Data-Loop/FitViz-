// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 初始化年份选择器
        const defaultYear = await loadYears('year-select');
        if (!defaultYear) {
            alert('没有可用的数据，请先导入数据');
            return;
        }
        
        // 初始化图表
        await loadPageData(defaultYear, 'all');
        
        // 绑定事件监听器
        document.getElementById('year-select').addEventListener('change', handleFiltersChange);
        document.getElementById('gender-select').addEventListener('change', handleFiltersChange);
    } catch (error) {
        console.error('页面初始化失败:', error);
        alert('页面初始化失败: ' + error.message);
    }
});

// 处理筛选条件变化
async function handleFiltersChange() {
    const yearSelect = document.getElementById('year-select');
    const genderSelect = document.getElementById('gender-select');
    
    if (!yearSelect.value) {
        alert('请选择有效的年份');
        return;
    }
    
    try {
        await loadPageData(yearSelect.value, genderSelect.value);
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败: ' + error.message);
    }
}

// 加载页面数据
async function loadPageData(year, gender) {
    try {
        // 获取统计数据
        const statsData = await fetchAPI(`/stats/overview?year=${year}&gender=${gender}`);
        
        // 显示合格率数据
        updatePassRateStats(statsData.totalStats);
        
        // 渲染雷达图
        renderRadarChart(statsData.avgScores);
        
        // 渲染学院合格率矩形树图
        renderCollegePassRateTreemap(statsData.collegeStats);
        
        // 渲染项目合格率矩形树图
        renderItemPassRateTreemap(statsData.itemsStats);
    } catch (error) {
        console.error('加载页面数据失败:', error);
        throw error;
    }
}

// 更新合格率统计卡片
function updatePassRateStats(totalStats) {
    const overallPassRate = document.getElementById('overall-pass-rate');
    const malePassRate = document.getElementById('male-pass-rate');
    const femalePassRate = document.getElementById('female-pass-rate');
    
    // 合格标准: 各项目分数达到或超过50分视为合格
    // 计算合格率
    const passRate = calculatePassRate(totalStats.passed, totalStats.total);
    overallPassRate.textContent = formatPercent(passRate);
    
    // 固定获取男女生合格率（无论当前查看哪种性别）
    fetchAPI(`/stats/overview?year=${document.getElementById('year-select').value}&gender=男`)
        .then(maleData => {
            const malePassRateValue = calculatePassRate(maleData.totalStats.passed, maleData.totalStats.total);
            malePassRate.textContent = formatPercent(malePassRateValue);
        })
        .catch(error => {
            console.error('获取男生合格率失败:', error);
            malePassRate.textContent = '获取失败';
        });
    
    fetchAPI(`/stats/overview?year=${document.getElementById('year-select').value}&gender=女`)
        .then(femaleData => {
            const femalePassRateValue = calculatePassRate(femaleData.totalStats.passed, femaleData.totalStats.total);
            femalePassRate.textContent = formatPercent(femalePassRateValue);
        })
        .catch(error => {
            console.error('获取女生合格率失败:', error);
            femalePassRate.textContent = '获取失败';
        });
}

// 渲染雷达图
function renderRadarChart(avgScores) {
    const chart = initChart('radar-chart');
    if (!chart) return;
    
    const radarData = [{
        name: '平均分',
        value: [
            avgScores.height_weight_avg || 0,
            avgScores.vital_capacity_avg || 0,
            avgScores.sprint_avg || 0,
            avgScores.long_jump_avg || 0,
            avgScores.sit_reach_avg || 0,
            avgScores.endurance_avg || 0,
            avgScores.strength_avg || 0
        ],
        itemStyle: {
            color: '#3498db'
        },
        areaStyle: {
            color: 'rgba(52, 152, 219, 0.3)'
        }
    }];
    
    const option = generateRadarChartOption(radarData, '体测成绩雷达图');
    chart.setOption(option);
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
}

// 渲染学院合格率矩形树图
function renderCollegePassRateTreemap(collegeStats) {
    const chart = initChart('college-pass-rate');
    if (!chart) return;
    
    // 请求学院平均分数据
    const year = document.getElementById('year-select').value;
    const gender = document.getElementById('gender-select').value;
    
    // 准备数据
    const treeData = collegeStats.map(item => {
        const passRate = calculatePassRate(item.passed, item.total);
        return {
            name: item.college,
            value: item.total,
            passRate: passRate
        };
    });
    
    // 获取学院平均分
    fetchAPI(`/stats/college-avg?year=${year}&gender=${gender}`)
        .then(avgData => {
            // 合并平均分数据
            treeData.forEach(item => {
                const collegeAvg = avgData.find(avg => avg.college === item.name);
                if (collegeAvg) {
                    item.avgScore = collegeAvg.avgScore;
                    // 根据平均分设置颜色
                    item.itemStyle = {
                        color: getColorByScore(collegeAvg.avgScore)
                    };
                }
            });
            
            const option = generateTreemapOption(treeData, '各学院体测平均分');
            
            // 设置视觉映射范围
            option.series[0].visualMap = {
                type: 'continuous',
                min: 60,
                max: 90,
                inRange: {
                    color: [
                        '#e74c3c', '#e67e22', '#d35400', '#e67e22', '#d35400', '#e74c3c', 
                        '#c0392b', '#d35400', '#e67e22', '#f39c12', '#d35400', '#f39c12', 
                        '#8e44ad', '#9b59b6', '#2980b9', '#3498db', '#27ae60', '#2ecc71'
                    ]
                }
            };
            
            // 修改tooltip显示内容
            option.tooltip = {
                formatter: function(info) {
                    const { name, value, passRate, avgScore } = info.data;
                    let tooltip = `<div style="font-weight:bold;margin-bottom:5px;">${name}</div>`;
                    tooltip += `<div>总人数: ${value}</div>`;
                    tooltip += `<div>合格率: ${formatPercent(passRate)}</div>`;
                    tooltip += `<div>平均分: ${avgScore.toFixed(1)}</div>`;
                    return tooltip;
                }
            };
            
            // 修改标签显示内容
            option.series[0].label = {
                show: true,
                formatter: function(params) {
                    return `${params.name}\n${params.data.avgScore.toFixed(1)}分`;
                },
                fontSize: 14,
                color: '#333'
            };
            
            chart.setOption(option);
        })
        .catch(error => {
            console.error('获取学院平均分失败:', error);
            // 使用默认颜色
            treeData.forEach(item => {
                item.itemStyle = {
                    color: getColorByPassRate(item.passRate)
                };
            });
            
            const option = generateTreemapOption(treeData, '各学院体测合格率');
            chart.setOption(option);
        });
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
}

// 渲染项目合格率矩形树图
function renderItemPassRateTreemap(itemsStats) {
    const chart = initChart('item-pass-rate');
    if (!chart) return;
    
    // 获取当前筛选条件
    const year = document.getElementById('year-select').value;
    const gender = document.getElementById('gender-select').value;
    
    // 获取各项目的平均分
    fetchAPI(`/stats/overview?year=${year}&gender=${gender}`)
        .then(data => {
            const avgScores = data.avgScores;
            
            // 准备数据
            const treeData = [
                {
                    name: '体重身高',
                    value: itemsStats.height_weight_total,
                    passRate: calculatePassRate(itemsStats.height_weight_passed, itemsStats.height_weight_total),
                    avgScore: avgScores.height_weight_avg || 0
                },
                {
                    name: '肺活量',
                    value: itemsStats.vital_capacity_total,
                    passRate: calculatePassRate(itemsStats.vital_capacity_passed, itemsStats.vital_capacity_total),
                    avgScore: avgScores.vital_capacity_avg || 0
                },
                {
                    name: '50米跑',
                    value: itemsStats.sprint_total,
                    passRate: calculatePassRate(itemsStats.sprint_passed, itemsStats.sprint_total),
                    avgScore: avgScores.sprint_avg || 0
                },
                {
                    name: '立定跳远',
                    value: itemsStats.long_jump_total,
                    passRate: calculatePassRate(itemsStats.long_jump_passed, itemsStats.long_jump_total),
                    avgScore: avgScores.long_jump_avg || 0
                },
                {
                    name: '坐位体前屈',
                    value: itemsStats.sit_reach_total,
                    passRate: calculatePassRate(itemsStats.sit_reach_passed, itemsStats.sit_reach_total),
                    avgScore: avgScores.sit_reach_avg || 0
                },
                {
                    name: '长跑',
                    value: itemsStats.endurance_total,
                    passRate: calculatePassRate(itemsStats.endurance_passed, itemsStats.endurance_total),
                    avgScore: avgScores.endurance_avg || 0
                },
                {
                    name: '力量',
                    value: itemsStats.strength_total,
                    passRate: calculatePassRate(itemsStats.strength_passed, itemsStats.strength_total),
                    avgScore: avgScores.strength_avg || 0
                }
            ];
            
            // 为每个项目设置颜色
            treeData.forEach(item => {
                item.itemStyle = {
                    color: getColorByScore(item.avgScore)
                };
            });
            
            const option = generateTreemapOption(treeData, '各项目平均分');
            
            // 设置视觉映射范围
            option.series[0].visualMap = {
                type: 'continuous',
                min: 60,
                max: 90,
                inRange: {
                    color: [
                        '#e74c3c', '#e67e22', '#d35400', '#e67e22', '#d35400', '#e74c3c', 
                        '#c0392b', '#d35400', '#e67e22', '#f39c12', '#d35400', '#f39c12', 
                        '#8e44ad', '#9b59b6', '#2980b9', '#3498db', '#27ae60', '#2ecc71'
                    ]
                }
            };
            
            // 修改tooltip显示内容
            option.tooltip = {
                formatter: function(info) {
                    const { name, value, passRate, avgScore } = info.data;
                    let tooltip = `<div style="font-weight:bold;margin-bottom:5px;">${name}</div>`;
                    tooltip += `<div>总人数: ${value}</div>`;
                    tooltip += `<div>合格率: ${formatPercent(passRate)}</div>`;
                    tooltip += `<div>平均分: ${avgScore.toFixed(1)}</div>`;
                    return tooltip;
                }
            };
            
            // 修改标签显示内容
            option.series[0].label = {
                show: true,
                formatter: function(params) {
                    return `${params.name}\n${params.data.avgScore.toFixed(1)}分`;
                },
                fontSize: 14,
                color: '#333'
            };
            
            chart.setOption(option);
        })
        .catch(error => {
            console.error('获取平均分数据失败:', error);
            
            // 备用方案：使用合格率数据
            const treeData = [
                {
                    name: '体重身高',
                    value: itemsStats.height_weight_total,
                    passRate: calculatePassRate(itemsStats.height_weight_passed, itemsStats.height_weight_total)
                },
                {
                    name: '肺活量',
                    value: itemsStats.vital_capacity_total,
                    passRate: calculatePassRate(itemsStats.vital_capacity_passed, itemsStats.vital_capacity_total)
                },
                {
                    name: '50米跑',
                    value: itemsStats.sprint_total,
                    passRate: calculatePassRate(itemsStats.sprint_passed, itemsStats.sprint_total)
                },
                {
                    name: '立定跳远',
                    value: itemsStats.long_jump_total,
                    passRate: calculatePassRate(itemsStats.long_jump_passed, itemsStats.long_jump_total)
                },
                {
                    name: '坐位体前屈',
                    value: itemsStats.sit_reach_total,
                    passRate: calculatePassRate(itemsStats.sit_reach_passed, itemsStats.sit_reach_total)
                },
                {
                    name: '长跑',
                    value: itemsStats.endurance_total,
                    passRate: calculatePassRate(itemsStats.endurance_passed, itemsStats.endurance_total)
                },
                {
                    name: '力量',
                    value: itemsStats.strength_total,
                    passRate: calculatePassRate(itemsStats.strength_passed, itemsStats.strength_total)
                }
            ];
            
            // 为每个项目设置颜色
            treeData.forEach(item => {
                item.itemStyle = {
                    color: getColorByPassRate(item.passRate)
                };
            });
            
            const option = generateTreemapOption(treeData, '各项目合格率');
            chart.setOption(option);
        });
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
}

// 根据合格率获取颜色
function getColorByPassRate(rate) {
    if (rate >= 0.8) return '#27ae60'; // 优秀 - 深绿色
    if (rate >= 0.7) return '#7dcea0'; // 良好 - 浅绿色
    if (rate >= 0.5) return '#f1c40f'; // 中等 - 黄色
    if (rate >= 0.3) return '#e67e22'; // 及格 - 橙色
    return '#e74c3c'; // 不及格 - 红色
}

// 根据得分获取颜色
function getColorByScore(score) {
    if (score >= 88) return '#2ecc71'; // 优秀 - 鲜艳的绿色
    if (score >= 86) return '#27ae60'; // 优秀 - 深绿色
    if (score >= 84) return '#3498db'; // 良好 - 蓝色
    if (score >= 82) return '#2980b9'; // 良好 - 深蓝色
    if (score >= 80) return '#9b59b6'; // 良好 - 紫色
    if (score >= 78) return '#8e44ad'; // 中等偏上 - 深紫色
    if (score >= 76) return '#f39c12'; // 中等 - 橙色
    if (score >= 74) return '#d35400'; // 中等 - 深橙色
    if (score >= 72) return '#e67e22'; // 及格偏上 - 橙红色
    if (score >= 70) return '#d35400'; // 及格偏上 - 深橙红色
    if (score >= 68) return '#e74c3c'; // 及格 - 红色
    if (score >= 66) return '#c0392b'; // 及格 - 深红色
    if (score >= 64) return '#d35400'; // 及格 - 橙红色
    if (score >= 62) return '#e67e22'; // 及格 - 橙色
    return '#e74c3c'; // 及格 - 红色
} 