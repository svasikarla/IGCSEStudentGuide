#!/usr/bin/env python3
"""
Monitoring and Analytics for Ollama Question Generation

This module provides comprehensive monitoring, analytics, and reporting
for the Ollama question generation system.
"""

import asyncio
import json
import logging
import os
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

from supabase import create_client, Client
from .logging_config import setup_logging

logger = setup_logging()

@dataclass
class SystemMetrics:
    """System performance metrics"""
    timestamp: str
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    disk_free_gb: float
    ollama_running: bool
    ollama_memory_mb: Optional[float] = None

@dataclass
class GenerationMetrics:
    """Question generation metrics"""
    timestamp: str
    questions_generated_today: int
    questions_generated_total: int
    average_generation_time: float
    success_rate: float
    average_quality_score: float
    active_generations: int
    failed_generations_today: int

@dataclass
class QualityMetrics:
    """Quality assessment metrics"""
    timestamp: str
    average_quality_score: float
    questions_above_threshold: int
    questions_below_threshold: int
    common_quality_issues: List[str]
    quality_trend: str  # 'improving', 'stable', 'declining'

class OllamaMonitor:
    """Monitor for Ollama question generation system"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize monitor"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.metrics_history: List[Dict[str, Any]] = []
        
        logger.info("📊 Ollama Monitor initialized")
    
    def get_system_metrics(self) -> SystemMetrics:
        """Get current system performance metrics"""
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Check if Ollama is running
            ollama_running = False
            ollama_memory = None
            
            for proc in psutil.process_iter(['pid', 'name', 'memory_info']):
                try:
                    if 'ollama' in proc.info['name'].lower():
                        ollama_running = True
                        ollama_memory = proc.info['memory_info'].rss / (1024 * 1024)  # MB
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            return SystemMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_gb=memory.used / (1024**3),
                memory_total_gb=memory.total / (1024**3),
                disk_percent=disk.percent,
                disk_free_gb=disk.free / (1024**3),
                ollama_running=ollama_running,
                ollama_memory_mb=ollama_memory
            )
            
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return SystemMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_gb=0.0,
                memory_total_gb=0.0,
                disk_percent=0.0,
                disk_free_gb=0.0,
                ollama_running=False
            )
    
    async def get_generation_metrics(self) -> GenerationMetrics:
        """Get question generation metrics"""
        try:
            today = datetime.now().date()
            
            # Get today's generation stats
            today_stats = self.supabase.rpc('get_generation_stats', {'days_back': 1}).execute()
            
            # Get total generation stats
            total_stats = self.supabase.table('quiz_questions').select(
                'id, generation_timestamp, quality_score'
            ).not_.is_('generation_timestamp', 'null').execute()
            
            # Calculate metrics
            questions_today = 0
            failed_today = 0
            generation_times = []
            quality_scores = []
            
            if today_stats.data:
                for stat in today_stats.data:
                    if stat.get('generation_date') == today.isoformat():
                        questions_today += stat.get('questions_count', 0)
            
            if total_stats.data:
                for question in total_stats.data:
                    if question.get('quality_score'):
                        quality_scores.append(float(question['quality_score']))
            
            # Calculate success rate (simplified)
            total_questions = len(total_stats.data) if total_stats.data else 0
            success_rate = 0.95 if total_questions > 0 else 0.0  # Placeholder calculation
            
            return GenerationMetrics(
                timestamp=datetime.now().isoformat(),
                questions_generated_today=questions_today,
                questions_generated_total=total_questions,
                average_generation_time=5.0,  # Placeholder - would need actual timing data
                success_rate=success_rate,
                average_quality_score=sum(quality_scores) / len(quality_scores) if quality_scores else 0.0,
                active_generations=0,  # Would need real-time tracking
                failed_generations_today=failed_today
            )
            
        except Exception as e:
            logger.error(f"Error getting generation metrics: {e}")
            return GenerationMetrics(
                timestamp=datetime.now().isoformat(),
                questions_generated_today=0,
                questions_generated_total=0,
                average_generation_time=0.0,
                success_rate=0.0,
                average_quality_score=0.0,
                active_generations=0,
                failed_generations_today=0
            )
    
    async def get_quality_metrics(self) -> QualityMetrics:
        """Get quality assessment metrics"""
        try:
            # Get recent quality scores
            result = self.supabase.table('quiz_questions').select(
                'quality_score, generation_timestamp'
            ).not_.is_('quality_score', 'null').gte(
                'generation_timestamp', 
                (datetime.now() - timedelta(days=7)).isoformat()
            ).execute()
            
            quality_scores = []
            if result.data:
                quality_scores = [float(q['quality_score']) for q in result.data if q.get('quality_score')]
            
            # Calculate metrics
            threshold = 0.7
            above_threshold = sum(1 for score in quality_scores if score >= threshold)
            below_threshold = len(quality_scores) - above_threshold
            
            # Determine trend (simplified)
            trend = 'stable'
            if len(quality_scores) > 10:
                recent_avg = sum(quality_scores[-5:]) / 5 if len(quality_scores) >= 5 else 0
                older_avg = sum(quality_scores[-10:-5]) / 5 if len(quality_scores) >= 10 else 0
                
                if recent_avg > older_avg + 0.05:
                    trend = 'improving'
                elif recent_avg < older_avg - 0.05:
                    trend = 'declining'
            
            return QualityMetrics(
                timestamp=datetime.now().isoformat(),
                average_quality_score=sum(quality_scores) / len(quality_scores) if quality_scores else 0.0,
                questions_above_threshold=above_threshold,
                questions_below_threshold=below_threshold,
                common_quality_issues=[],  # Would need detailed analysis
                quality_trend=trend
            )
            
        except Exception as e:
            logger.error(f"Error getting quality metrics: {e}")
            return QualityMetrics(
                timestamp=datetime.now().isoformat(),
                average_quality_score=0.0,
                questions_above_threshold=0,
                questions_below_threshold=0,
                common_quality_issues=[],
                quality_trend='unknown'
            )
    
    async def collect_all_metrics(self) -> Dict[str, Any]:
        """Collect all metrics"""
        try:
            system_metrics = self.get_system_metrics()
            generation_metrics = await self.get_generation_metrics()
            quality_metrics = await self.get_quality_metrics()
            
            all_metrics = {
                'timestamp': datetime.now().isoformat(),
                'system': asdict(system_metrics),
                'generation': asdict(generation_metrics),
                'quality': asdict(quality_metrics)
            }
            
            # Store in history
            self.metrics_history.append(all_metrics)
            
            # Keep only last 100 entries
            if len(self.metrics_history) > 100:
                self.metrics_history = self.metrics_history[-100:]
            
            return all_metrics
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return {'error': str(e), 'timestamp': datetime.now().isoformat()}
    
    def save_metrics_to_file(self, metrics: Dict[str, Any], filename: Optional[str] = None):
        """Save metrics to file"""
        try:
            if not filename:
                date_str = datetime.now().strftime("%Y%m%d")
                filename = f"logs/generation/metrics_{date_str}.json"
            
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # Load existing data if file exists
            existing_data = []
            if os.path.exists(filename):
                try:
                    with open(filename, 'r') as f:
                        existing_data = json.load(f)
                except json.JSONDecodeError:
                    existing_data = []
            
            # Append new metrics
            existing_data.append(metrics)
            
            # Keep only last 1000 entries per file
            if len(existing_data) > 1000:
                existing_data = existing_data[-1000:]
            
            # Save back to file
            with open(filename, 'w') as f:
                json.dump(existing_data, f, indent=2)
            
            logger.debug(f"Metrics saved to {filename}")
            
        except Exception as e:
            logger.error(f"Error saving metrics: {e}")
    
    def generate_health_report(self) -> Dict[str, Any]:
        """Generate system health report"""
        try:
            if not self.metrics_history:
                return {'status': 'no_data', 'message': 'No metrics available'}
            
            latest_metrics = self.metrics_history[-1]
            
            # Analyze system health
            system = latest_metrics.get('system', {})
            generation = latest_metrics.get('generation', {})
            quality = latest_metrics.get('quality', {})
            
            health_issues = []
            health_score = 100
            
            # Check system resources
            if system.get('memory_percent', 0) > 90:
                health_issues.append('High memory usage')
                health_score -= 20
            
            if system.get('cpu_percent', 0) > 90:
                health_issues.append('High CPU usage')
                health_score -= 15
            
            if system.get('disk_percent', 0) > 90:
                health_issues.append('Low disk space')
                health_score -= 25
            
            if not system.get('ollama_running', False):
                health_issues.append('Ollama not running')
                health_score -= 50
            
            # Check generation performance
            if generation.get('success_rate', 0) < 0.8:
                health_issues.append('Low generation success rate')
                health_score -= 20
            
            if generation.get('average_quality_score', 0) < 0.6:
                health_issues.append('Low average quality score')
                health_score -= 15
            
            # Determine overall status
            if health_score >= 90:
                status = 'excellent'
            elif health_score >= 70:
                status = 'good'
            elif health_score >= 50:
                status = 'warning'
            else:
                status = 'critical'
            
            return {
                'status': status,
                'health_score': max(0, health_score),
                'issues': health_issues,
                'timestamp': datetime.now().isoformat(),
                'recommendations': self._generate_recommendations(health_issues)
            }
            
        except Exception as e:
            logger.error(f"Error generating health report: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def _generate_recommendations(self, issues: List[str]) -> List[str]:
        """Generate recommendations based on health issues"""
        recommendations = []
        
        for issue in issues:
            if 'memory' in issue.lower():
                recommendations.append('Consider reducing batch size or concurrent generations')
            elif 'cpu' in issue.lower():
                recommendations.append('Reduce generation frequency or use a smaller model')
            elif 'disk' in issue.lower():
                recommendations.append('Clean up old log files and temporary data')
            elif 'ollama' in issue.lower():
                recommendations.append('Start Ollama service: ollama serve')
            elif 'success rate' in issue.lower():
                recommendations.append('Check Ollama connectivity and model availability')
            elif 'quality' in issue.lower():
                recommendations.append('Review and update generation prompts')
        
        return recommendations
    
    async def run_continuous_monitoring(self, interval_seconds: int = 300):
        """Run continuous monitoring loop"""
        logger.info(f"Starting continuous monitoring (interval: {interval_seconds}s)")
        
        while True:
            try:
                # Collect metrics
                metrics = await self.collect_all_metrics()
                
                # Save to file
                self.save_metrics_to_file(metrics)
                
                # Generate health report
                health = self.generate_health_report()
                
                # Log health status
                if health['status'] in ['warning', 'critical']:
                    logger.warning(f"Health status: {health['status']} (score: {health['health_score']})")
                    if health.get('issues'):
                        logger.warning(f"Issues: {', '.join(health['issues'])}")
                else:
                    logger.info(f"Health status: {health['status']} (score: {health['health_score']})")
                
                # Wait for next interval
                await asyncio.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

class PerformanceAnalyzer:
    """Analyze performance trends and patterns"""
    
    def __init__(self, metrics_file: str):
        """Initialize analyzer with metrics file"""
        self.metrics_file = metrics_file
        self.metrics_data = self._load_metrics()
    
    def _load_metrics(self) -> List[Dict[str, Any]]:
        """Load metrics from file"""
        try:
            if os.path.exists(self.metrics_file):
                with open(self.metrics_file, 'r') as f:
                    return json.load(f)
            return []
        except Exception as e:
            logger.error(f"Error loading metrics: {e}")
            return []
    
    def analyze_generation_trends(self, days: int = 7) -> Dict[str, Any]:
        """Analyze generation trends over time"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Filter recent metrics
            recent_metrics = [
                m for m in self.metrics_data 
                if datetime.fromisoformat(m['timestamp']) >= cutoff_date
            ]
            
            if not recent_metrics:
                return {'status': 'no_data'}
            
            # Extract generation data
            daily_counts = {}
            quality_scores = []
            
            for metric in recent_metrics:
                date = datetime.fromisoformat(metric['timestamp']).date()
                generation = metric.get('generation', {})
                
                if date not in daily_counts:
                    daily_counts[date] = 0
                
                daily_counts[date] += generation.get('questions_generated_today', 0)
                
                quality = metric.get('quality', {})
                if quality.get('average_quality_score'):
                    quality_scores.append(quality['average_quality_score'])
            
            # Calculate trends
            daily_values = list(daily_counts.values())
            avg_daily_generation = sum(daily_values) / len(daily_values) if daily_values else 0
            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
            
            return {
                'status': 'success',
                'period_days': days,
                'average_daily_generation': avg_daily_generation,
                'average_quality_score': avg_quality,
                'total_questions': sum(daily_values),
                'daily_breakdown': {str(k): v for k, v in daily_counts.items()}
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trends: {e}")
            return {'status': 'error', 'error': str(e)}

# CLI interface for monitoring
async def main():
    """Main monitoring function"""
    import argparse
    from dotenv import load_dotenv
    
    load_dotenv('.env.local')
    
    parser = argparse.ArgumentParser(description='Ollama Generation Monitoring')
    parser.add_argument('--monitor', action='store_true', help='Start continuous monitoring')
    parser.add_argument('--health', action='store_true', help='Generate health report')
    parser.add_argument('--metrics', action='store_true', help='Collect current metrics')
    parser.add_argument('--interval', type=int, default=300, help='Monitoring interval in seconds')
    
    args = parser.parse_args()
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.error("Missing Supabase credentials")
        return
    
    monitor = OllamaMonitor(supabase_url, supabase_key)
    
    try:
        if args.monitor:
            await monitor.run_continuous_monitoring(args.interval)
        elif args.health:
            health = monitor.generate_health_report()
            print(json.dumps(health, indent=2))
        elif args.metrics:
            metrics = await monitor.collect_all_metrics()
            print(json.dumps(metrics, indent=2))
        else:
            parser.print_help()
    
    except KeyboardInterrupt:
        logger.info("Monitoring stopped")
    except Exception as e:
        logger.error(f"Monitoring failed: {e}")

if __name__ == '__main__':
    asyncio.run(main())
