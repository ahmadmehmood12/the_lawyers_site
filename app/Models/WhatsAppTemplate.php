<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'name', 'language', 'category', 'body_preview', 'variable_count', 'status'])]
#[Table('whatsapp_templates')]
class WhatsAppTemplate extends Model {}
