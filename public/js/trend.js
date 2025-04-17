// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 获取可用年份
        const years = await fetchAPI('/years');
        if (years.length === 0) {
            alert('没有可用的数据，请先导入数据');
            return;
        }
        
        // 填充年份范围选择器
        fillYearRangeSelectors(years);
        
        // 初始化学院选择器
        await loadColleges('college-select', years[0]);
        
        // 初始化班级选择器
        const defaultCollege = document.getElementById('college-select').value;
        if (defaultCollege) {
            await loadClasses('class-select', years[0], defaultCollege);
        }
        
        // 根据范围显示/隐藏选择器
        handleScopeChange();
        
        // 初始化图表
        await loadTrendData();
        
        // 绑定事件监听器
        document.getElementById('scope-select').addEventListener('change', handleScopeChange);
        document.getElementById('college-select').addEventListener('change', handleCollegeChange);
        document.getElementById('class-select').addEventListener('change', handleFiltersChange);
        document.getElementById('gender-select').addEventListener('change', handleFiltersChange);
        document.getElementById('start-year').addEventListener('change', handleFiltersChange);
        document.getElementById('end-year').addEventListener('change', handleFiltersChange);
    } catch (error) {
        console.error('页面初始化失败:', error);
        alert('页面初始化失败: ' + error.message);
    }
});

// 填充年份范围选择器
function fillYearRangeSelectors(years) {
    const startYearSelect = document.getElementById('start-year');
    const endYearSelect = document.getElementById('end-year');
    
    if (!startYearSelect || !endYearSelect) return;
    
    startYearSelect.innerHTML = '';
    endYearSelect.innerHTML = '';
    
    years.forEach(year => {
        const startOption = document.createElement('option');
        startOption.value = year;
        startOption.textContent = year;
        startYearSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = year;
        endOption.textContent = year;
        endYearSelect.appendChild(endOption);
    });
    
    // 设置默认值为最小年份和最大年份
    if (years.length > 0) {
        startYearSelect.value = Math.min(...years);
        endYearSelect.value = Math.max(...years);
    }
}

// 处理范围变化
function handleScopeChange() {
    const scopeSelect = document.getElementById('scope-select');
    const collegeFilterGroup = document.getElementById('college-filter-group');
    const classFilterGroup = document.getElementById('class-filter-group');
    
    // 根据范围显示/隐藏筛选器
    if (scopeSelect.value === 'school') {
        collegeFilterGroup.style.display = 'none';
        classFilterGroup.style.display = 'none';
    } else if (scopeSelect.value === 'college') {
        collegeFilterGroup.style.display = 'block';
        classFilterGroup.style.display = 'none';
    } else if (scopeSelect.value === 'class') {
        collegeFilterGroup.style.display = 'block';
        classFilterGroup.style.display = 'block';
    }
    
    // 更新数据
    handleFiltersChange();
}

// 处理学院变化
async function handleCollegeChange() {
    const startYear = document.getElementById('start-year').value;
    const college = document.getElementById('college-select').value;
    const scopeSelect = document.getElementById('scope-select');
    
    if (scopeSelect.value === 'class' && startYear && college) {
        try {
            await loadClasses('class-select', startYear, college);
        } catch (error) {
            console.error('加载班级失败:', error);
        }
    }
    
    await handleFiltersChange();
}

// 处理筛选条件变化
async function handleFiltersChange() {
    await loadTrendData();
}

// 加载趋势数据
async function loadTrendData() {
    try {
        const startYear = document.getElementById('start-year').value;
        const endYear = document.getElementById('end-year').value;
        const genderSelect = document.getElementById('gender-select').value;
        const scopeSelect = document.getElementById('scope-select').value;
        const collegeSelect = document.getElementById('college-select');
        const classSelect = document.getElementById('class-select');
        
        if (!startYear || !endYear) {
            console.error('缺少必要参数');
            return;
        }
        
        const params = {
            startYear,
            endYear,
            gender: genderSelect,
            type: scopeSelect
        };
        
        if (scopeSelect === 'college' && collegeSelect) {
            params.college = collegeSelect.value;
        } else if (scopeSelect === 'class' && collegeSelect && classSelect) {
            params.college = collegeSelect.value;
            params.className = classSelect.value;
        }
        
        // 构建URL查询参数
        const queryString = Object.entries(params)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        // 获取趋势数据
        const data = await fetchAPI(`/trends?${queryString}`);
        
        // 渲染合格率趋势图
        renderPassRateTrendChart(data.passRateByYear);
        
        // 渲染各项目分数趋势图
        renderItemScoreTrendCharts(data.avgScoresByYear);
    } catch (error) {
        console.error('加载趋势数据失败:', error);
        alert('加载趋势数据失败: ' + error.message);
    }
}

// 渲染合格率趋势图
function renderPassRateTrendChart(passRateByYear) {
    const chart = initChart('pass-rate-trend-chart');
    if (!chart) return;
    
    // 提取年份和合格率
    const years = passRateByYear.map(item => item.year);
    // 合格标准: 各项目分数达到或超过50分视为合格
    const passRates = passRateByYear.map(item => calculatePassRate(item.passed, item.total));
    
    // 准备数据
    const data = [{
        name: '合格率',
        data: passRates.map(rate => (rate * 100).toFixed(1)),
        itemStyle: {
            color: '#3498db'
        },
        markLine: {
            data: [
                { type: 'average', name: '平均值' }
            ]
        }
    }];
    
    // 获取查看范围
    const scopeType = document.getElementById('scope-select').value;
    let title = '全校体测合格率趋势';
    
    if (scopeType === 'college') {
        const collegeSelect = document.getElementById('college-select');
        if (collegeSelect && collegeSelect.value) {
            title = collegeSelect.value + ' 体测合格率趋势';
        }
    } else if (scopeType === 'class') {
        const classSelect = document.getElementById('class-select');
        if (classSelect && classSelect.value) {
            title = classSelect.value + ' 体测合格率趋势';
        }
    }
    
    const option = generateLineChartOption(data, years, title, '合格率');
    
    // 调整Y轴显示百分比
    option.yAxis.axisLabel = {
        formatter: '{value}%'
    };
    
    chart.setOption(option);
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
}

// 渲染各项目分数趋势图
function renderItemScoreTrendCharts(avgScoresByYear) {
    // 提取年份
    const years = avgScoresByYear.map(item => item.year);
    
    // 身高体重趋势图
    renderItemTrendChart('height-weight-trend-chart', '身高体重分数趋势', years, avgScoresByYear.map(item => item.height_weight_avg || 0));
    
    // 肺活量趋势图
    renderItemTrendChart('vital-capacity-trend-chart', '肺活量分数趋势', years, avgScoresByYear.map(item => item.vital_capacity_avg || 0));
    
    // 50米跑趋势图
    renderItemTrendChart('sprint-trend-chart', '50米跑分数趋势', years, avgScoresByYear.map(item => item.sprint_avg || 0));
    
    // 立定跳远趋势图
    renderItemTrendChart('long-jump-trend-chart', '立定跳远分数趋势', years, avgScoresByYear.map(item => item.long_jump_avg || 0));
    
    // 长跑趋势图（800/1000米）
    renderItemTrendChart('endurance-trend-chart', '长跑分数趋势', years, avgScoresByYear.map(item => item.endurance_avg || 0));
    
    // 力量趋势图（引体向上/仰卧起坐）
    renderItemTrendChart('strength-trend-chart', '力量分数趋势', years, avgScoresByYear.map(item => item.strength_avg || 0));
}

// 渲染单个项目趋势图
function renderItemTrendChart(elementId, title, years, values) {
    const chart = initChart(elementId);
    if (!chart) return;
    
    // 准备数据
    const data = [{
        name: '分数',
        data: values.map(value => value.toFixed(2)),
        itemStyle: {
            color: '#3498db'
        },
        markLine: {
            data: [
                { type: 'average', name: '平均值' }
            ]
        }
    }];
    
    const option = generateLineChartOption(data, years, title, '分数');
    chart.setOption(option);
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
} 