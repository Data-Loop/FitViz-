// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 初始化年份选择器
        const defaultYear = await loadYears('year-select');
        if (!defaultYear) {
            alert('没有可用的数据，请先导入数据');
            return;
        }
        
        // 初始化学院选择器
        const defaultCollege = await loadColleges('college-select', defaultYear);
        
        // 初始化班级选择器（如果需要）
        updateClassFilterVisibility();
        if (document.getElementById('scope-select').value === 'class') {
            await loadClasses('class-select', defaultYear, defaultCollege);
        }
        
        // 初始化图表
        await loadAnalysisData();
        
        // 绑定事件监听器
        document.getElementById('year-select').addEventListener('change', handleYearChange);
        document.getElementById('gender-select').addEventListener('change', handleFiltersChange);
        document.getElementById('scope-select').addEventListener('change', handleScopeChange);
        document.getElementById('college-select').addEventListener('change', handleCollegeChange);
        document.getElementById('class-select').addEventListener('change', handleFiltersChange);
    } catch (error) {
        console.error('页面初始化失败:', error);
        alert('页面初始化失败: ' + error.message);
    }
});

// 处理年份变化
async function handleYearChange() {
    const year = document.getElementById('year-select').value;
    if (!year) return;
    
    try {
        // 重新加载学院列表
        const college = await loadColleges('college-select', year);
        
        // 如果是班级视图，重新加载班级列表
        if (document.getElementById('scope-select').value === 'class' && college) {
            await loadClasses('class-select', year, college);
        }
        
        // 更新数据
        await loadAnalysisData();
    } catch (error) {
        console.error('处理年份变化失败:', error);
        alert('加载数据失败: ' + error.message);
    }
}

// 处理范围变化
function handleScopeChange() {
    updateClassFilterVisibility();
    handleCollegeChange();
}

// 更新班级筛选器可见性
function updateClassFilterVisibility() {
    const scopeSelect = document.getElementById('scope-select');
    const collegeFilterGroup = document.getElementById('college-filter-group');
    const classFilterGroup = document.getElementById('class-filter-group');
    
    if (scopeSelect.value === 'college') {
        collegeFilterGroup.style.display = 'block';
        classFilterGroup.style.display = 'none';
    } else if (scopeSelect.value === 'class') {
        collegeFilterGroup.style.display = 'block';
        classFilterGroup.style.display = 'block';
    }
}

// 处理学院变化
async function handleCollegeChange() {
    const year = document.getElementById('year-select').value;
    const college = document.getElementById('college-select').value;
    const scopeSelect = document.getElementById('scope-select');
    
    if (scopeSelect.value === 'class' && year && college) {
        try {
            await loadClasses('class-select', year, college);
        } catch (error) {
            console.error('加载班级失败:', error);
        }
    }
    
    await loadAnalysisData();
}

// 处理筛选条件变化
async function handleFiltersChange() {
    await loadAnalysisData();
}

// 加载分析数据
async function loadAnalysisData() {
    try {
        const yearSelect = document.getElementById('year-select');
        const genderSelect = document.getElementById('gender-select');
        const scopeSelect = document.getElementById('scope-select');
        const collegeSelect = document.getElementById('college-select');
        const classSelect = document.getElementById('class-select');
        
        if (!yearSelect.value || !collegeSelect.value) {
            console.error('缺少必要参数');
            return;
        }
        
        const params = {
            year: yearSelect.value,
            gender: genderSelect.value,
            type: scopeSelect.value
        };
        
        if (scopeSelect.value === 'college') {
            params.college = collegeSelect.value;
        } else if (scopeSelect.value === 'class') {
            params.college = collegeSelect.value;
            params.className = classSelect.value;
        }
        
        // 构建URL查询参数
        const queryString = Object.entries(params)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        // 获取详细统计数据
        const data = await fetchAPI(`/stats/detail?${queryString}`);
        
        // 更新统计卡片
        updateStatCards(data.stats);
        
        // 渲染雷达图
        renderRadarChart(data.avgScores);
        
        // 渲染盒须图
        renderBoxplotChart(data.scores);
    } catch (error) {
        console.error('加载分析数据失败:', error);
        alert('加载分析数据失败: ' + error.message);
    }
}

// 更新统计卡片
function updateStatCards(stats) {
    // 合格标准: 各项目分数达到或超过50分视为合格
    const passRate = calculatePassRate(stats.passed, stats.total);
    document.getElementById('pass-rate').textContent = formatPercent(passRate);
    document.getElementById('average-score').textContent = stats.avg_score ? stats.avg_score.toFixed(2) : '0';
    document.getElementById('student-count').textContent = stats.total || '0';
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
    
    // 获取查看范围类型
    const scopeType = document.getElementById('scope-select').value;
    const scopeName = scopeType === 'college' 
        ? document.getElementById('college-select').value 
        : document.getElementById('class-select').value;
    
    const title = `${scopeName} 体测成绩雷达图`;
    const option = generateRadarChartOption(radarData, title);
    chart.setOption(option);
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
}

// 渲染盒须图
function renderBoxplotChart(scores) {
    const chart = initChart('boxplot-chart');
    if (!chart) return;

    // 准备数据
    const fields = [
        { name: '总分', field: 'total_score' },
        { name: '体重身高', field: 'height_weight_score' },
        { name: '肺活量', field: 'vital_capacity_score' },
        { name: '50米跑', field: 'sprint_50m_score' },
        { name: '立定跳远', field: 'long_jump_score' },
        { name: '坐位体前屈', field: 'sit_reach_score' },
        { name: '长跑', field: 'endurance_score' },
        { name: '力量', field: 'strength_score' }
    ];

    const data = fields.map(({ name, field }) => {
        const boxData = prepareBoxplotData(scores, field);
        return {
            name,
            type: 'boxplot',
            data: [boxData],
            tooltip: {
                formatter: function(param) {
                    return `${name}<br/>
                           最大值：${param.data[4]}<br/>
                           上四分位：${param.data[3]}<br/>
                           中位数：${param.data[2]}<br/>
                           下四分位：${param.data[1]}<br/>
                           最小值：${param.data[0]}`;
                }
            }
        };
    });

    const option = {
        title: {
            text: '成绩分布盒须图',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'item'
        },
        grid: {
            left: '10%',
            right: '10%',
            bottom: '15%'
        },
        xAxis: {
            type: 'category',
            data: ['']
        },
        yAxis: {
            type: 'value',
            name: '分数',
            min: 0,
            max: 100
        },
        series: data
    };

    chart.setOption(option);
    window.addEventListener('resize', () => chart.resize());
}

// 处理盒须图数据
function prepareBoxplotData(scores, field) {
    // 过滤掉null和undefined
    const validScores = scores.filter(s => s[field] != null)
        .map(s => parseFloat(s[field]))
        .filter(score => !isNaN(score));
    
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