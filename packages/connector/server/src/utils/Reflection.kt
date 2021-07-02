package io.tellery.utils

import org.reflections.Reflections
import kotlin.reflect.KClass


val <S : Any> KClass<S>.allSubclasses: List<KClass<out S>>
    get() {
        val pkgName = this.qualifiedName!!.substringBeforeLast('.')
        val reflections = Reflections(pkgName)
        return reflections.getSubTypesOf(this.java).map { it.kotlin }.toList()
    }
