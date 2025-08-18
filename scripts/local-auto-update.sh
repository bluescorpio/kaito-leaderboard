#!/bin/bash

# 本地定时更新脚本
# 用法: ./scripts/local-auto-update.sh

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在正确的目录
check_directory() {
    if [[ ! -f "config.js" ]] || [[ ! -f "kol.json" ]]; then
        log_error "请确保在GoKaito项目根目录下运行此脚本"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装，请先安装Node.js"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "Git未安装，请先安装Git"
        exit 1
    fi
    
    if [[ ! -f "scripts/update-kol-data.js" ]]; then
        log_error "更新脚本不存在: scripts/update-kol-data.js"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 备份现有数据
backup_data() {
    local backup_file="kol.json.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "备份现有数据到: $backup_file"
    cp kol.json "$backup_file"
    log_success "数据备份完成"
}

# 更新数据
update_data() {
    log_info "开始更新KOL数据..."
    
    if node scripts/update-kol-data.js; then
        log_success "数据更新完成"
        return 0
    else
        log_error "数据更新失败"
        return 1
    fi
}

# 检查Git状态
check_git_status() {
    if git diff --quiet kol.json; then
        log_warning "kol.json 无变化，跳过提交"
        return 1
    else
        log_info "检测到 kol.json 有变化"
        return 0
    fi
}

# 提交到Git
commit_changes() {
    log_info "准备提交变更..."
    
    # 获取文件信息
    local file_size=$(ls -lh kol.json | awk '{print $5}')
    local update_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 添加文件
    git add kol.json
    
    # 提交
    local commit_message="🤖 自动更新KOL数据 - ${update_time}

📊 数据统计:
- 文件大小: ${file_size}
- 更新时间: ${update_time}
- 触发方式: 本地定时任务

🔄 本次更新包含最新的个人影响力排行榜数据"

    if git commit -m "$commit_message"; then
        log_success "变更提交成功"
        
        # 推送到远程
        log_info "推送到远程仓库..."
        if git push; then
            log_success "推送成功"
        else
            log_error "推送失败"
            return 1
        fi
    else
        log_error "提交失败"
        return 1
    fi
}

# 主函数
main() {
    local start_time=$(date)
    
    echo "================================================"
    echo "🤖 KOL数据自动更新脚本"
    echo "📅 开始时间: $start_time"
    echo "================================================"
    
    # 执行各步骤
    check_directory
    check_dependencies
    backup_data
    
    if update_data; then
        if check_git_status; then
            commit_changes
        fi
    else
        log_error "更新失败，终止流程"
        exit 1
    fi
    
    local end_time=$(date)
    echo "================================================"
    echo "✅ 自动更新流程完成"
    echo "📅 结束时间: $end_time"
    echo "================================================"
}

# 运行主函数
main "$@"
